import React from 'react'
import Latestnews3Css from './Latestnews3.module.css'
import news1 from '../assets/template3images/news1.jpg'
import news2 from '../assets/template3images/news2.jpg'
import news3 from '../assets/template3images/news3.jpg'
export default function Latestnews3() {
    return (
        <>
            <section className={Latestnews3Css['heading-sec-w']}>

                <div className={Latestnews3Css['heading-main-title-w']}>
                    <div className={Latestnews3Css['sub-title-w']}>
                        <h3>Daily Updates</h3>
                    </div>
                    <h1>Latest News</h1>
                </div>
            </section>

            <section className={Latestnews3Css['news-sec']}>
                <div className={Latestnews3Css['contain-news']}>
                    <div className={Latestnews3Css['ncards-wrapper']}>
                        <div className={Latestnews3Css['news-card']}>

                            <img src={news1} alt="news1" />
                            <div className={Latestnews3Css['news-card-content']}>
                                <h2>CCTV Installation Tricks.</h2>
                                <p>If you are able to install a camera, there is still a few tricks to pay extra attention.</p>
                                <button className={Latestnews3Css['button-sq-red']}>Read More</button>

                            </div>

                        </div>
                        <div className={Latestnews3Css['news-card']}>
                            <img src={news2} alt="news2" />
                            <div className={Latestnews3Css['news-card-content']}>
                                <h2>How To Monitor Your Facility.</h2>
                                <p>Hire a special man who knows how to deal with this. Or read this post.</p>
                                <button className={Latestnews3Css['button-sq-red']}>Read More</button>

                            </div>
                        </div>
                        <div className={Latestnews3Css['news-card']}>

                            <img src={news3} alt="" />
                            <div className={Latestnews3Css['news-card-content']}>
                                <h2>Outdoor Security Process.</h2>
                                <p>Working with different clients, we collected rich experience and want to share it with you..</p>
                                <button className={Latestnews3Css['button-sq-red']}>Read More</button>

                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </>
    )
}
