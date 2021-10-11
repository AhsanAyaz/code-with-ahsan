import React from "react"
import { Button, Card } from "react-bootstrap"

const GitHubProject = ({ project }) => {
  const openProject = () => {
    window.open(project.url, "_blank", "noreferrer noopener")
  }
  return (
    <Card>
      {project.imageUrl && <Card.Img variant="top" src={project.imageUrl} />}
      <Card.Body>
        <Card.Title className='cardTitle'>{project.name}</Card.Title>
        {project.description && <Card.Text>{project.description}</Card.Text>}
        <Button variant="primary" onClick={openProject}>
          Open Project
        </Button>
      </Card.Body>
    </Card>
  )
}

export default GitHubProject
