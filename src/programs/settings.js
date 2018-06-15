import React from 'react'
import { union } from 'tagmeme'
import { withSubscriptions, mapSubscription } from 'raj-subscription'
import { assembleProgram, mapEffect } from 'raj-compose'
import { Form, TextBox } from '../views'
import { Route } from '../routing'
import { withErrors, handleError, AuthenticationGuard } from '../errors'

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

const data = ({ router: { emit }, remote: { watchViewer, updateViewer } }) => ({
  watchViewer,
  updateViewer,
  goHome: emit(Route.Home({}))
})

function makeForm (viewer) {
  return viewer
    ? {
      username: viewer.username,
      password: '',
      email: viewer.email,
      image: viewer.image || '',
      bio: viewer.bio || ''
    }
    : {
      username: '',
      password: '',
      email: '',
      image: '',
      bio: ''
    }
}

const Msg = union([
  'SetUsername',
  'SetPassword',
  'SetEmail',
  'SetImage',
  'SetBio',
  'SetViewer',
  'SaveSettings',
  'SavedSettings'
])

function logic (data) {
  const init = [
    {
      viewer: null,
      ...makeForm()
    }
  ]

  function update (msg, model) {
    return Msg.match(msg, {
      SetUsername: username => [{ ...model, username }],
      SetPassword: password => [{ ...model, password }],
      SetEmail: email => [{ ...model, email }],
      SetImage: image => [{ ...model, image }],
      SetBio: bio => [{ ...model, bio }],
      SetViewer: viewer => [{ ...model, viewer, ...makeForm(viewer) }],
      SaveSettings: () => [
        model,
        mapEffect(
          data.updateViewer({
            username: model.username,
            password: model.password ? model.password : undefined,
            email: model.email,
            image: model.image,
            bio: model.bio
          }),
          Msg.SavedSettings
        )
      ],
      SavedSettings: ({ error }) =>
        (error
          ? [handleError(model, error, { attemptedAction: 'save' })]
          : [model, data.goHome])
    })
  }

  const subscriptions = () => ({
    viewer: () => mapSubscription(data.watchViewer(), Msg.SetViewer)
  })

  return { init, update, subscriptions }
}

function view (model, dispatch) {
  return (
    <AuthenticationGuard
      isAuthenticated={model.viewer}
      pageName='settings'
      pageAction='access your settings'
    >
      <div className='settings-page'>
        <div className='container page'>
          <div className='row'>
            <div className='col-md-6 offset-md-3 col-xs-12'>
              <h1 className='text-xs-center'>Your Settings</h1>
              <Form onSubmit={() => dispatch(Msg.SaveSettings())}>
                <fieldset>
                  <TextBox
                    {...{
                      placeholder: 'URL of profile picture',
                      value: model.image,
                      onValue (value) {
                        dispatch(Msg.SetImage(value))
                      }
                    }}
                  />
                  <TextBox
                    {...{
                      isLarge: true,
                      placeholder: 'Your Name',
                      value: model.username,
                      onValue (value) {
                        dispatch(Msg.SetUsername(value))
                      }
                    }}
                  />
                  <TextBox
                    {...{
                      isLarge: true,
                      isMultiLine: true,
                      placeholder: 'Short bio about you',
                      value: model.bio,
                      onValue (value) {
                        dispatch(Msg.SetBio(value))
                      }
                    }}
                  />
                  <TextBox
                    {...{
                      isLarge: true,
                      placeholder: 'Email',
                      value: model.email,
                      onValue (value) {
                        dispatch(Msg.SetEmail(value))
                      }
                    }}
                  />
                  <TextBox
                    {...{
                      isLarge: true,
                      isPassword: true,
                      placeholder: 'Password',
                      value: model.password,
                      onValue (value) {
                        dispatch(Msg.SetPassword(value))
                      }
                    }}
                  />
                  <button className='btn btn-lg btn-primary pull-xs-right'>
                    Update Settings
                  </button>
                </fieldset>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </AuthenticationGuard>
  )
}
