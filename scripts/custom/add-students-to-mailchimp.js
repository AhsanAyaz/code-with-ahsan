require('dotenv').config()
const admin = require('firebase-admin')
const mailchimp = require('@mailchimp/mailchimp_marketing')
const path = require('path')
const md5 = require('md5')

// Firebase setup
const serviceAccount = require(path.join(__dirname, './code-with-ahsan-service-account.json'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
})

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_API_SERVER, // E.g. us1
})

const db = admin.firestore()
const audienceId = process.env.MAILCHIMP_AUDIENCE_ID // Replace with your Mailchimp audience ID
const tag = 'codewithahsan.dev'

async function fetchUsers() {
  const usersRef = db.collection('enrollment')
  const snapshot = await usersRef.get()
  const users = new Map()
  snapshot.forEach((doc) => {
    let userData = doc.data()
    const { courseId, userEmail, addedToMailChimp } = userData

    if (addedToMailChimp) {
      return
    }

    let user = users.get(userEmail) || {
      email_address: userEmail,
      status: 'subscribed',
      tags: [tag],
      firestoreIds: [],
    }
    user.tags.push(`cwa_course_${courseId}`)
    user.firestoreIds.push(doc.id) // Store Firestore document IDs for later update
    users.set(userEmail, user)
  })
  return Array.from(users.values())
}

async function addToMailchimp(users) {
  for (let user of users) {
    const batch = db.batch()
    try {
      await mailchimp.lists.addListMember(audienceId, {
        email_address: user.email_address,
        status: user.status,
        tags: user.tags,
      })
    } catch (error) {
      if (error && error.response?.text) {
        const responseText = JSON.parse(error.response.text)
        if (responseText.title === 'Member Exists') {
          try {
            const subscriberHash = md5(user.email_address.toLowerCase())
            await mailchimp.lists.updateListMember(audienceId, subscriberHash, {
              email_address: user.email_address,
              status: user.status,
              tags: user.tags,
            })
          } catch (err) {
            console.error(`Error updating ${user.email_address}:`, error)
          }
        }
      } else {
        console.error(`Error adding ${user.email_address}:`, error)
      }
    }
    console.log(`Added ${user.email_address} to Mailchimp`)

    // Prepare Firestore batch update
    user.firestoreIds.forEach((id) => {
      const docRef = db.collection('enrollment').doc(id)
      batch.update(docRef, { addedToMailChimp: true })
    })

    // Commit Firestore batch update
    try {
      await batch.commit()
      console.log('Firestore documents updated successfully for ', user.email_address)
    } catch (err) {
      console.error('Error while updating Firestore:', err)
    }
  }
}

async function main() {
  try {
    const users = await fetchUsers()
    await addToMailchimp(users)
    console.log('All users processed')
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
