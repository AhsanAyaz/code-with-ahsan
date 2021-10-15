import React from "react"
import { Link } from "gatsby"
import { Container } from "react-bootstrap"

export default ({ name, githubUsername }) => {
  return (
    <Container className="text-center person">
      <Link to={`/people/${githubUsername}`} style={{ textDecoration: "none" }}>
        <img
          src="https://www.pngarts.com/files/3/Boy-Avatar-PNG-Transparent-Image.png"
          alt=""
        />
        <h2 className="mt-5">{name}</h2>
      </Link>
    </Container>
  )
}
