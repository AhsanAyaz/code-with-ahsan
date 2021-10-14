import React from "react"
import { Link } from "gatsby"
import { Container } from "react-bootstrap"

export default ({ name, githubUsername }) => {
  return (
    <Container className="text-center">
      <Link to={`/people/${githubUsername}`} style={{ textDecoration: "none" }}>
        <h2 className="mt-5">{name}</h2>
      </Link>
    </Container>
  )
}
