import React from 'react'
import Footer3Css from './Footer3.module.css'
export default function Footer3() {
    return (
        <>
            <footer>
                <div className={Footer3Css['footer']}>


                <div className ={Footer3Css['row-foot']}>



                <div className ={Footer3Css['column-foot']}>
                <div className ={Footer3Css.span}>..........</div>
                <h2 className={Footer3Css.hh1}>Citrix</h2>
                <h1 className={Footer3Css.hh2}>Consultancy</h1>
                <p className ={Footer3Css['main-para']}>Visualize quality intellectual capital without superior collaboration and idea sharing
                installed base portals.</p>
                <p><i className ="fas fa-map-marker-alt i1 "></i> Address: 4010 Feeney Way</p>

                <p> <i className ="fas fa-phone-alt i1 "></i>020 7946 0020 </p>

                <p><i className ="fas fa-envelope i1"></i>critrixconsultancy @gmail.com</p>

                </div>
                <div className ={Footer3Css['column-foot']}>
                <div className ={Footer3Css['span']}>..........</div>
                <h2 className={Footer3Css['hh1']}>Our Locations</h2>
                <h1 clsassName={Footer3Css['hh2']}>Where to find us?</h1>
                <img className ={Footer3Css['foot-img']} src="https://i.ibb.co/L0HJLvC/img-footer-map.png" height="200px" alt="img-footer-map"
                border="0"/>

                </div>

                <div className ={Footer3Css['column-foot']} style={{"background-color":"transparent"}}>
                <div className ={Footer3Css['col']}>
                <p><i className ="fas fa-map-marker-alt i1 "></i> San Diego: 619 270 8578 </p>

                <p><i className ="fas fa-map-marker-alt i1 "></i> Ontario: 613 285 5534</p>
                <p><i className ="fas fa-map-marker-alt i1 "></i>London: 020 7946 0020 </p>




                </div>



                </div>

                <div>
                <div className ={Footer3Css['column-foot']}>
                <div className ={Footer3Css['span']}>..........</div>
                <h2 className={Footer3Css['hh1']}>Get in touch</h2>
                <h1 className={Footer3Css['hh2']}>Citrix Social links</h1>
                <p className ={Footer3Css['main-para']}>Taking seamless key performance indicators offline to maximise the long tail</p>
                <p>
                <i className ="fab fa-facebook i "></i>
                <i className ="fab fa-twitter-square i "></i>
                <i className ="fab fa-pinterest i "></i>
                <i className ="fab fa-linkedin i"></i>
                </p>
                </div>
                </div>



                </div>


                <div className ={Footer3Css['bottom-foot']}>
                <div className ={Footer3Css['copyright']}>
                <p>Copyright © 2021 CITRIX CONSULTANCY.All Rights Reserved.</p>
                </div>


                </div>
                </div>
            </footer>
        </>
    )
}
