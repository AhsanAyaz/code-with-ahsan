import React from 'react'
import About3Css from './About3.module.css'
import news3 from '../assets/template3images/news3.jpg'
export default function About3() {
    return (
        <>
  <section className={About3Css['heading-sec']}>

<div className={About3Css['heading-main-title']}>
    <div className={About3Css['sub-title']}>
        <h3>We are Best</h3>
    </div>
    <h1>About Us</h1>
</div>
</section>
<div className={About3Css['about-sec']}>
<div className={About3Css['about-containe']}>
  <div className={About3Css['about-wrap']}>
    <div className={About3Css['ab-img']}>
      <img src={news3} alt="news3"/>
    </div>
    <div className={About3Css['about-content']}>
      <h1>Commited to your business</h1>
      <p>Given the complexity of forming a team including consciously or unconsciously developing team interaction norms and
      guidelines, ending up with an effective, functioning team is downright amazing.</p>
      <button className={About3Css['button-sq-red']}>Read More</button>
    </div> 
                    

    </div>
  </div>
  
</div>

        </>
    )
}
