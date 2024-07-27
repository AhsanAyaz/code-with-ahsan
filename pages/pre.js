import Button from '@/components/Button'
import SimpleLayout from '../layouts/SimpleLayout'

export default function AngularCookbookReader() {
  return (
    <SimpleLayout
      seoTitle={`Practical React Essentials in Urdu/Hindi`}
      title={'Practical React Essentials in Urdu/Hindi!'}
      description={'Get the Practical React Essentials course in Urdu/Hindi'}
      SideBarContent={() => (
        <aside>
          <img
            alt="practical react essentials cover"
            src="https://www.codewithahsan.dev/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fcwa%2Fimage%2Fupload%2Fv1713751038%2FReact_Project_Tutorial_2_b1af7a0e04.png&w=1920&q=75"
            className="object-contain h-72 md:h-full"
          ></img>
        </aside>
      )}
    >
      <section className="flex flex-col gap-4">
        <h4 className="my-0">
          So you're interested in the{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://codewithahsan.teachable.com/p/practical-react-essentials"
          >
            Practical React Essentials course
          </a>
          ?{' '}
        </h4>
        <p className="my-0">
          Well, you made the right choice 🎉. <br />
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://codewithahsan.teachable.com/p/practical-react-essentials"
          >
            Check the course outline here
          </a>
        </p>
        <p className="my-0">
          There are a couple of ways you can buy the course. Please find them below:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => {
              window.open(
                'https://codewithahsan.teachable.com/purchase?product_id=5463466',
                '_blank'
              )
            }}
          >
            Pay with Card/Paypal ($USD)
          </Button>
          <Button
            onClick={() => {
              window.open(
                'https://www.notion.so/Buy-the-Practical-React-Essentials-in-Urdu-Hindi-Course-b34e1f48adbe4eb2a7d95c948068930a',
                '_blank'
              )
            }}
          >
            Pay with Bank Transfer (PKR)
          </Button>

          <Button
            onClick={() => {
              window.open(
                'https://button-crustacean-a78.notion.site/33-participants-can-get-the-Practical-React-Essentials-in-Urdu-Hindi-Course-for-FREE-9cbe31a19a9b474783e3860523c56315',
                '_blank'
              )
            }}
          >
            Apply for a FREE slot (11 remaining)
          </Button>
        </div>
      </section>
    </SimpleLayout>
  )
}
