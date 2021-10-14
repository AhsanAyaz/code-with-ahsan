import React from 'react'
import Accrediation3Css from './Accrediation3.module.css'
import accre1 from '../assets/template3images/accre1.png'
import accre2 from '../assets/template3images/accre2.png'
import accre3 from '../assets/template3images/accre3.png'
import accre4 from '../assets/template3images/accre4.png'
import accre5 from '../assets/template3images/accre5.png'
import accre6 from '../assets/template3images/accre6.png'
import accre7 from '../assets/template3images/accre7.png'

export default function Accrediation3() {
    return (
        <>
        <section className={Accrediation3Css['heading-sec']}>

<div className={Accrediation3Css['heading-main-title']}>
  <div className={Accrediation3Css['sub-title']}>
    <h3>We are Verified by Govt</h3>
  </div>
  <h1>Accreditation</h1>
</div>
</section>
<section className={Accrediation3Css['accrediations-sec']}>
<div className={Accrediation3Css['container-accre']}>
  <div className={Accrediation3Css['accre-wrapper']}>
    <div className={Accrediation3Css.arow}>
      <div className={Accrediation3Css['a-card']}>
        <img src={accre1} alt="aacre1"/>
       
      </div>
      <div className={Accrediation3Css['a-card']}>
        <img src={accre2} alt="accre2"/>
       
      </div>
      <div className={Accrediation3Css['a-card']}>
        <img src={accre3} alt="accre3"/>
       
      </div>
      <div className={Accrediation3Css['a-card']}>
        <img src={accre4} alt="accre4"/>
       
      </div>
      <div className={Accrediation3Css['a-card']}>
        <img src={accre5} alt="accre5"/>
       
      </div>
      <div className={Accrediation3Css['a-card']}>
        <img src={accre6} alt="accre6"/>
       
      </div>
      <div className={Accrediation3Css['a-card']}>
        <img src={accre7} alt="accre7"/>
       
      </div>
      
    </div>
    
  
  </div>

</div>
</section>
        </>
    )
}
