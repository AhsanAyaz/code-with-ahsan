import React from 'react'
import styles from '../../hackstack/hackstack.module.css'
import LayoutWrapper from '../../../../components/LayoutWrapper'
import EventPage from './index'

EventPage.getLayout = ({ children }) => {
  return (
    <main className={styles.eventsPage}>
      <LayoutWrapper>{children}</LayoutWrapper>
    </main>
  )
}

export default EventPage
