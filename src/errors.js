import React from 'react'

function capitalize (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function makePageError (error, pageName) {
  switch (error.type) {
    case 'not-found':
      return {
        title: capitalize(`${pageName} was not found`),
        description: "That's all we know"
      }
    default:
      return {
        title: `Error loading ${pageName}`,
        description: `${pageName} is currently unavailable`
      }
  }
}

function makeActionError (error, attemptedAction) {
  switch (error.type) {
    case 'forbidden':
      return `You do not have permission to ${attemptedAction}.`
    case 'server-error':
      return `There was a server issue. Please try to ${attemptedAction} again.`
    case 'unauthorized':
      return `You are currently signed out. You must sign in to ${attemptedAction}.`
    default:
      return `Something went wrong trying to ${attemptedAction}. Please try again.`
  }
}

export function handleError (model, error, { pageName, attemptedAction }) {
  if (pageName) {
    const failure = makePageError(error, pageName)
    return { ...model, failure }
  }

  if (error.type === 'invalid') {
    return { ...model, validationErrors: error.data }
  }

  const errorMessage = makeActionError(error, attemptedAction)
  return {
    ...model,
    errorMessages: [errorMessage].concat(model.errorMessages || [])
  }
}

function dismissErrors (model) {
  return { ...model, errorMessages: [], validationErrors: null }
}

const dismissErrorMsg = {}

export function withErrors (program) {
  const { update: programUpdate, view: programView } = program

  function update (msg, model) {
    return msg === dismissErrorMsg
      ? [dismissErrors(model)]
      : programUpdate(msg, model)
  }

  function view (model, dispatch) {
    const { failure, errorMessages = [] } = model
    if (failure) {
      return <SimplePage {...failure} />
    }

    return (
      <React.Fragment>
        <ErrorOverlay
          {...{ errorMessages, onDismiss: () => dispatch(dismissErrorMsg) }}
        />
        {programView(model, dispatch)}
      </React.Fragment>
    )
  }

  return { ...program, update, view }
}

const errorOverlayStyles = {
  position: 'fixed',
  top: '0',
  background: 'rgb(250, 250, 250)',
  padding: '20px',
  border: '1px solid',
  zIndex: 1
}

function ErrorOverlay ({ errorMessages, onDismiss }) {
  return (
    errorMessages &&
    errorMessages.length > 0 &&
    <div className='error-messages' style={errorOverlayStyles}>
      {errorMessages.map((error, index) => (
        <p key={`${error}-${index}`}>{error}</p>
      ))}
      <button onClick={() => onDismiss()}>Dismiss</button>
    </div>
  )
}

export function SimplePage ({ title, description }) {
  return (
    <main className='container'>
      <h1>{title}</h1>
      <p>{description}</p>
    </main>
  )
}

export function AuthenticationGuard ({
  isAuthenticated,
  pageName,
  pageAction,
  children
}) {
  return isAuthenticated
    ? children
    : SimplePage({
      title: `Error loading ${pageName}`,
      description: `You must be signed in to ${pageAction || 'view this page'}.`
    })
}

export function ValidationErrors ({ validationErrors }) {
  const errors = Object.keys(validationErrors || {})
    .map(field => {
      const fieldErrors = validationErrors[field]
      return fieldErrors.map(description => `${field} ${description}`)
    })
    .reduce((list, errors) => list.concat(errors), [])

  return (
    errors.length > 0 &&
    <ul className='error-messages'>
      {errors.map(error => <li key={error}>{error}</li>)}
    </ul>
  )
}
