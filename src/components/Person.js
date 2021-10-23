import React from "react"
import { Link } from "gatsby"
import { Container } from "react-bootstrap"

export default ({ name, githubUsername }) => {
  return (
    <Container
      className="text-center"
      style={{
        height: "100%",
        padding: "2rem",
        boxShadow: "0px 0px 5px 3px rgba(0, 0, 0, 0.2)",
        borderRadius: "3px",
      }}
    >
      <Link to={`/people/${githubUsername}`} style={{ textDecoration: "none" }}>
        <img
          src={`https://github.com/${githubUsername}.png`}
          style={{ width: "8rem", height: "8rem", borderRadius: "100%" }}
        />
        <h2 className="mt-5" style={{ fontSize: "1.6rem", fontWeight: "600" }}>
          {name}
        </h2>
      </Link>
    </Container>
  )
}
