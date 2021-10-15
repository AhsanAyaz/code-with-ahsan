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
      <Container className="text-left">
        <section className="peoplecontainer">
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
