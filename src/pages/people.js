import React from "react"
import { graphql } from "gatsby"
import { PageLayout, PageTitle } from "../components"
import { SEO } from "../utils"
import Container from "react-bootstrap/Container"
import Person from "../components/Person"

export default ({ data }) => {
  const people = data.allPeopleJson.edges || []
  return (
    <PageLayout>
      <SEO title="Community" />
      <PageTitle title="Community" />
      <Container
        className="text-left"
        style={{
          padding: "1rem 0"
        }}
      >
        <section 
        style={{
          display: "grid",
          placeItems: "center",
          gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
          gridTemplateRows: "20rem",
          gap: "1.5rem"
        }}> 
          {people.map(({ node }) => (
            <Person
              key={node.id}
              name={node.name}
              projects={node.projects}
              githubUsername={node.githubUsername}
            />
          ))}
        </section>
      </Container>
    </PageLayout>
  )
}

export const query = graphql`
  query {
    allPeopleJson(filter: { show: { ne: false } }) {
      edges {
        node {
          id
          projects {
            name
            url
            description
            imageUrl
          }
          name
          githubUsername
        }
      }
    }
  }
`
