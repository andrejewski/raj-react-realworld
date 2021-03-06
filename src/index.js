import React from 'react'
import ReactDOM from 'react-dom'
import { program } from 'raj-react'
import { makeProgram as makeAppProgram } from './programs'
import { router } from './routing'
import { createRemote } from './remote'

if (!window.location.hash) {
  window.location.hash = '/'
}

const remote = createRemote({
  baseUrl: 'https://conduit.productionready.io/api'
})

const App = program(React.Component, () =>
  makeAppProgram({ dataOptions: { router, remote } })
)

ReactDOM.render(<App />, document.getElementById('root'))
