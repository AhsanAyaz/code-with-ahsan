import React, { PureComponent } from 'react'
import ReactMarkdown from 'react-markdown'
const LegitMarkdown = ({ children }) => {
  return (
    <ReactMarkdown
      components={{
        h3: (props) => <h3 className="text-3xl font-bold mb-2 mt-6">{props.children}</h3>,
        a: (props) => (
          <a className="text-blue-500" target={'_blank'} {...props}>
            {props.children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

export default LegitMarkdown
