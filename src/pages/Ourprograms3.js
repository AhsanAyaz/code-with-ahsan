import React from 'react'
import Ourprograms3Css from './Ourprograms.module.css'
import news1 from '../assets/template3images/news1.jpg'
import news2 from '../assets/template3images/news2.jpg'
import news3 from '../assets/template3images/news3.jpg'
export default function Ourprograms3() {
    return (
        <>

            <section className={Ourprograms3Css['heading-sec']}>

                <div className={Ourprograms3Css['heading-main-title']}>
                    <div className={Ourprograms3Css['sub-title']}>
                        <h3>Govt Affiliate Programs</h3>
                    </div>
                    <h1>Our Programs</h1>
                </div>
            </section>

            <div className={Ourprograms3Css['our-programs-section']}>
                <div className={Ourprograms3Css['container-main']}>
                    <div className={Ourprograms3Css['programs-cards-wrapper']}>

                        <div className={Ourprograms3Css['program-card']}>
                            <div className={Ourprograms3Css['program-card-img']}>
                                <img src={news1} alt="news1" />
                                <div className={Ourprograms3Css['icon-min']}>
                                    <lord-icon src="https://cdn.lordicon.com/mtdulhdc.json" trigger="loop" colors={{"primary":"#000000","secondary":"#c01120"}}
                                        style={{"width":"50px;","height":"50px"}}>
                                    </lord-icon>

                                </div>
                            </div>
                            <div className={Ourprograms3Css['program-card-content']}>
                                <h2 className={Ourprograms3Css['program-card_title']}> Cultural Awareness Show</h2>
                                <p className={Ourprograms3Css['program-card-body']}>
                                    Cultural Awareness is critical for any workforce that seeks to yield positive outcomes. Watch this video to learn about
                                    cultural awareness in the workplace
                                </p>
                                <button className={Ourprograms3Css['button-sq']}>Read More</button>

                            </div>
                        </div>
                        <div className={Ourprograms3Css['program-card']}>
                            <div className={Ourprograms3Css['program-card-img']}>
                                <img src={news2} alt="news" />
                                <div className={Ourprograms3Css['icon-min']}>
                                    <lord-icon src="https://cdn.lordicon.com/vcoyflbj.json" trigger="loop" colors={{"primary":"#000000","secondary":"#c01120"}}
                                        style={{"width":"50px;","height":"50px"}}>
                                    </lord-icon>

                                </div>
                            </div>
                            <div class={Ourprograms3Css['program-card-content']}>
      <h2 class={Ourprograms3Css['program-card_title']}>Military Virtual Training</h2>
      <p class={Ourprograms3Css['program-card-body']}>
        Watch this video to see one of the Department of Defense's approaches to building cultural awareness and reducing risk
        in culturally diverse environments.
      </p>
      <button class={Ourprograms3Css['button-sq']}>Read More</button>
  
    </div>
  </div>
                        <div className={Ourprograms3Css['program-card']}>
                            <div className={Ourprograms3Css['program-card-img']}>
                                <img src={news3} alt="news3" />
                                <div className={Ourprograms3Css['icon-min']}>
                                    <lord-icon src="https://cdn.lordicon.com/igpsgesd.json" trigger="loop" colors={{"primary":"#000000","secondary":"#c01120"}}
                                        style={{"width":"50px;","height":"50px"}}>
                                    </lord-icon>

                                </div>
                            </div>
                            <div className={Ourprograms3Css['program-card-content']}>
                                <h2 className={Ourprograms3Css['program-card_title']}>Insider Threat Resilience</h2>
                                <p className={Ourprograms3Css['program-card-body']}>
                                    Resilience allows individuals to bounce back from setbacks and stressful situations. Without this quality, some people
                                    may develop increased risks
                                </p>
                                <button className={Ourprograms3Css['button-sq']}>Read More</button>

                            </div>
                        </div>


                    </div></div>

            </div>
        </>
    )
}
