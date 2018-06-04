import React from 'react'

export class Form extends React.Component {
  render () {
    const { onSubmit, ...formProps } = this.props
    return (
      <form
        {...{
          ...formProps,
          onSubmit (event) {
            event.preventDefault()
            onSubmit()
          }
        }}
      />
    )
  }
}
