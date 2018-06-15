import React from 'react'
import { union } from 'tagmeme'
import { assembleProgram, mapEffect } from 'raj-compose'
import { withSubscriptions, mapSubscription } from 'raj-subscription'
import { Route, getURLForRoute } from '../routing'
import { Form } from '../views'
import { withErrors, handleError, ValidationErrors } from '../errors'

export function makeProgram ({ dataOptions }) {
  return withSubscriptions(
    withErrors(
      assembleProgram({
        data,
        dataOptions,
        logic,
        view
      })
    )
  )
}

const data = ({ router: { emit }, remote: { signIn, watchViewer } }) => ({
  signIn,
  watchViewer,
  goToProfile: username => emit(Route.Profile({ routeParams: { username } }))
})

const Msg = union([
  'SetEmail',
  'SetPassword',
  'SetViewer',
  'SignIn',
  'SignedIn'
])

function logic (data) {
  const init = [{ email: '', password: '', isSigningIn: false }]

  function update (msg, model) {
    return Msg.match(msg, {
      SetEmail: email => [{ ...model, email }],
      SetPassword: password => [{ ...model, password }],
      SetViewer: viewer => [model, viewer && data.goToProfile(viewer.username)],
      SignIn: () => [
        { ...model, isSigningIn: true },
        mapEffect(
          data.signIn({
            email: model.email,
            password: model.password
          }),
          Msg.SignedIn
        )
      ],
      SignedIn: ({ error }) => {
        const newModel = { ...model, isSigningIn: false }
        return error
          ? [handleError(newModel, error, { attemptedAction: 'log in' })]
          : [{ ...newModel }]
      }
    })
  }

  const subscriptions = () => ({
    viewer: () => mapSubscription(data.watchViewer(), Msg.SetViewer)
  })

  return { init, update, subscriptions }
}

function view (model, dispatch) {
  const registerUrl = getURLForRoute(Route.Register({}))

  return (
    <div className='auth-page'>
      <div className='container page'>
        <div className='row'>
          <div className='col-md-6 offset-md-3 col-xs-12'>
            <h1 className='text-xs-center'>Sign in</h1>
            <p className='text-xs-center'>
              <a href={registerUrl}>Need an account?</a>
            </p>

            <ValidationErrors {...model} />

            <Form onSubmit={() => dispatch(Msg.SignIn())}>
              <fieldset className='form-group'>
                <input
                  className='form-control form-control-lg'
                  type='text'
                  placeholder='Email'
                  disabled={model.isSigningIn}
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
                  disabled={model.isSigningIn}
                  required
                  value={model.password}
                  onChange={e => dispatch(Msg.SetPassword(e.target.value))}
                />
              </fieldset>
              <button
                disabled={model.isSigningIn}
                className='btn btn-lg btn-primary pull-xs-right'
              >
                Sign up
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}
