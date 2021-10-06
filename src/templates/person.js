import React from "react"
import Container from "react-bootstrap/Container"
import { PageLayout, PageTitle } from "../components"

import SEO from "../utils/seo"

export default data => {
  const { name, githubUsername, projects } = data.pageContext
  return (
    <PageLayout>
      <SEO title={name} description={`${name}'s Portfolio`} />
      <Container className="text-center" fluid>
        <PageTitle title={name} />
        <Container className="text-justify">
          <div>Github Username: {githubUsername}</div>
          <h2>Projects</h2>
          {projects.map((project, index) => (
            <div key={index}>
              <a href={project.url} target="_blank" rel="noopener noreferrer">
                {project.name}
              </a>
            </div>
          ))}
        </Container>
      </Container>
    </PageLayout>
  )
}
