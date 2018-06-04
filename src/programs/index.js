import React from 'react'
import spa from 'raj-spa'
import { batchPrograms } from 'raj-compose'
import { makeProgram as makeHeaderProgram } from './header'
import { makeProgram as makeHomeProgram } from './home'
import { makeProgram as makeLoginProgram } from './login'
import { makeProgram as makeLogoutProgram } from './logout'
import { makeProgram as makeRegisterProgram } from './register'
import { makeProgram as makeSettingsProgram } from './settings'
import { Route } from '../routing'
import notFoundImage from '../stump.jpg'
import notImplementedImage from '../innovation.jpg'

// Test user: a@a.example.a.com / __test1234 / password

function footerView () {
  return (
    <footer>
      <div className='container'>
        <a href='/' className='logo-font'>
          conduit
        </a>
        <span className='attribution'>
          An interactive learning project from{' '}
          <a href='https://thinkster.io'>Thinkster</a>
          . Code & design licensed under MIT.
        </span>
      </div>
    </footer>
  )
}

const blankProgram = {
  init: [],
  update: () => [],
  view () {}
}

function viewProgram (view) {
  return { init: [], update: () => [], view }
}

function makeNotFoundProgram () {
  return viewProgram(() => {
    return (
      <main id='content' className='container' tabIndex='-1'>
        <h1>Not Found</h1>
        <div className='row'>
          <img
            src={notFoundImage}
            style={{
              width: 365,
              height: 344,
              margin: '20px auto'
            }}
            alt='I do not know'
          />
        </div>
      </main>
    )
  })
}

function makeNotImplementedProgram () {
  return viewProgram(() => {
    return (
      <main id='content' className='container' tabIndex='-1'>
        <h1>Not Implemented (yet)</h1>
        <div className='row'>
          <img
            src={notImplementedImage}
            style={{
              width: 286,
              height: 643,
              margin: '20px auto'
            }}
            alt='Waiting for this page to be birthed from PayPal money'
          />
        </div>
      </main>
    )
  })
}

function makePageProgram ({ dataOptions }) {
  return spa({
    router: dataOptions.router,
    initialProgram: blankProgram,
    getRouteProgram (route) {
      const makeProgram = Route.match(
        route,
        {
          Home: () => makeHomeProgram,
          Login: () => makeLoginProgram,
          Logout: () => makeLogoutProgram,
          Register: () => makeRegisterProgram,
          NotFound: () => makeNotFoundProgram,
          Settings: () => makeSettingsProgram
        },
        () => makeNotImplementedProgram
      )
      return makeProgram({ dataOptions })
    }
  })
}

export function makeProgram ({ dataOptions }) {
  return batchPrograms(
    [makeHeaderProgram({ dataOptions }), makePageProgram({ dataOptions })],
    ([headerView, pageView]) => {
      return (
        <React.Fragment>
          {headerView()}
          {pageView()}
          {footerView()}
        </React.Fragment>
      )
    }
  )
}
