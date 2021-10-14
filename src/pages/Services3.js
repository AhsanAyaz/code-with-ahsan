import React from 'react'
import Services3Css from './Services3.module.css'
export default function Services3() {
    return (
        <>
            <section className={Services3Css['heading-sec']}>

                <div className={Services3Css['heading-main-title']}>
                    <div className={Services3Css['sub-title']}>
                        <h3>Best In Town</h3>
                    </div>
                    <h1>Services</h1>
                </div>
            </section>
            <section>
                <div className={`${Services3Css['container-services']} ${Services3Css['flex-row']}`}>
                    <div className={Services3Css['card-and-content-wrap']}>

                        <div className={Services3Css['serv-cards-wrapper']}>
                            <div className={Services3Css['serv-card']}>
                                <lord-icon src="https://cdn.lordicon.com/rruosuro.json" trigger="loop-on-hover"
                                    colors={{ "primary": "#ffffff", "secondary": "#ffffff" }} style={{ "width": "150px;", "height": "150px" }}>
                                </lord-icon>
                                <div className={Services3Css['card-text']}>
                                    <h1>Static Security</h1>
                                    <p>Settle a guard house behind your facility and we'll monitor the activity around the house. Settle a guard house behind
                                        your facility and we'll monitor the activity around the house. </p>

                                </div>
                                <button className={Services3Css['button-sq']}>Read More</button>


                            </div>
                            <div className={Services3Css['serv-card']}>


                                <lord-icon src="https://cdn.lordicon.com/idxcmsio.json" trigger="loop-on-hover"
                                    colors={{ "primary": "#ffffff", "secondary": "#ffffff" }} style={{ "width": "150px;", "height": "150px" }}>
                                </lord-icon>
                                <div className={Services3Css['card-text']}>

                                    <h1>Mobile Patrolling </h1>
                                    <p>Settle a guard house behind your facility and we'll monitor the activity around the house.
                                        Settle a guard house behind your facility and we'll monitor the activity around the house.
                                    </p>
                                </div>
                                <button className={Services3Css['button-sq']}>Read More</button>
                            </div>
                            <div className={Services3Css['serv-card']}>
                                <lord-icon src="https://cdn.lordicon.com/tvafngxn.json" trigger="loop-on-hover"
                                    colors={{ "primary": "#ffffff", "secondary": "#ffffff" }} style={{ "width": "150px;", "height": "150px" }}>
                                </lord-icon>
                                <div className={Services3Css['card-text']}>
                                    <h1>CCTV Monitoring</h1>
                                    <p>our strong men and professionals will do 24/7 security surveillance of your house with focus .
                                        our strong men and professionals will do 24/7 security surveillance of your house with focus .
                                    </p>
                                </div>

                                <button className={Services3Css['button-sq']}>Read More</button>

                            </div>
                       </div>
                       </div>
                       </div>

            </section>
        </>

    )
}
