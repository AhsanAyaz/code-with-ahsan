import React from "react"
import { Container } from "react-bootstrap"
import Header from "./Header"
import Footer from "./Footer"

export default ({ children }) => (
  <Container fluid className="px-0 pb-5 theme-light app-container">
    <Header />
    <Container fluid className="pt-5 mt-5 text-center ">
      {children}
    </Container>
    <Footer />
  </Container>
)
