import React from 'react'
import { union } from 'tagmeme'
import { assembleProgram, mapEffect } from 'raj-compose'
import { withSubscriptions, mapSubscription } from 'raj-subscription'
import { Route, getURLForRoute } from '../routing'

export function makeProgram ({ dataOptions }) {
  return withSubscriptions(
    assembleProgram({
      data,
      dataOptions,
      logic,
      view
    })
  )
}

const data = ({ router: { emit }, remote: { signUp, watchViewer } }) => ({
  signUp,
  watchViewer,
  goToProfile: username => emit(Route.Profile({ routeParams: { username } }))
})

const Msg = union([
  'SetUsername',
  'SetEmail',
  'SetPassword',
  'SetViewer',
  'SignUp',
  'SignedUp'
])

function logic (data) {
  const init = [
    { username: '', email: '', password: '', isSigningUp: false, error: null }
  ]

  function update (msg, model) {
    return Msg.match(msg, {
      SetUsername: username => [{ ...model, username }],
      SetEmail: email => [{ ...model, email }],
      SetPassword: password => [{ ...model, password }],
      SetViewer: viewer => [model, viewer && data.goToProfile(viewer.username)],
      SignUp: () => [
        { ...model, isSigningUp: true },
        mapEffect(
          data.signUp({
            email: model.email,
            password: model.password,
            username: model.username
          }),
          Msg.SignedUp
        )
      ],
      SignedUp: ({ error }) => {
        const newModel = { ...model, isSigningUp: false, error: null }
        if (error) {
          return [{ ...newModel, error }]
        }
        return [{ ...newModel }]
      }
    })
  }

  const subscriptions = () => ({
    viewer: () => mapSubscription(data.watchViewer(), Msg.SetViewer)
  })

  return { init, update, subscriptions }
}

function view (model, dispatch) {
  const loginUrl = getURLForRoute(Route.Login({}))

  return (
    <div className='auth-page'>
      <div className='container page'>
        <div className='row'>
          <div className='col-md-6 offset-md-3 col-xs-12'>
            <h1 className='text-xs-center'>Sign up</h1>
            <p className='text-xs-center'>
              <a href={loginUrl}>Have an account?</a>
            </p>

            {/* model.errors.length > 0 &&
              <ul className='error-messages'>
                {model.errors.map(error => (
                  <li>That email is already taken</li>
                ))}
              </ul> */}

            <form
              onSubmit={e => {
                e.preventDefault()
                dispatch(Msg.SignUp())
              }}
            >
              <fieldset className='form-group'>
                <input
                  className='form-control form-control-lg'
                  type='text'
                  placeholder='Your Name'
                  disabled={model.isSigningUp}
                  required
                  value={model.username}
                  onChange={e => dispatch(Msg.SetUsername(e.target.value))}
                />
              </fieldset>
              <fieldset className='form-group'>
                <input
                  className='form-control form-control-lg'
                  type='text'
                  placeholder='Email'
                  disabled={model.isSigningUp}
                  required
                  value={model.email}
                  onChange={e => dispatch(Msg.SetEmail(e.target.value))}
                />
              </fieldset>
              <fieldset className='form-group'>
                <input
                  className='form-control form-control-lg'
                  type='password'
                  placeholder='Password'
                  disabled={model.isSigningUp}
                  required
                  value={model.password}
                  onChange={e => dispatch(Msg.SetPassword(e.target.value))}
                />
              </fieldset>
              <button
                disabled={model.isSigningUp}
                className='btn btn-lg btn-primary pull-xs-right'
              >
                Sign up
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
