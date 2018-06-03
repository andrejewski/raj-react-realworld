import React from 'react'
import { assembleProgram } from 'raj-compose'
import { withSubscriptions, mapSubscription } from 'raj-subscription'
import { Route, getURLForRoute } from '../routing'
import { union } from 'tagmeme'

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

const data = ({
  router: { subscribe: watchRoute },
  remote: { watchViewer }
}) => ({
  watchRoute,
  watchViewer
})

const Msg = union(['SetRoute', 'SetViewer'])

function logic (data) {
  const init = [{ route: null, viewer: null }]

  function update (msg, model) {
    return Msg.match(msg, {
      SetRoute: route => [{ ...model, route }],
      SetViewer: viewer => [{ ...model, viewer }]
    })
  }

  const subscriptions = () => ({
    route: () => mapSubscription(data.watchRoute(), Msg.SetRoute),
    viewer: () => mapSubscription(data.watchViewer(), Msg.SetViewer)
  })

  return { init, update, subscriptions }
}

function href (messageType, currentRoute, routeParams) {
  const url = getURLForRoute(
    Route[messageType](routeParams ? { routeParams } : {})
  )
  const isActive =
    currentRoute &&
    Route.match(
      currentRoute,
      {
        [messageType]: () => true
      },
      () => false
    )
  return { url, isActive }
}

const createNavLink = currentRoute => ({ route, routeParams, children }) => {
  const { url, isActive } = href(route, currentRoute, routeParams)
  return (
    <li className='nav-item'>
      <a
        {...{
          href: url,
          className: isActive ? 'nav-link active' : 'nav-link'
        }}
      >
        {children}
      </a>
    </li>
  )
}

function view ({ route, viewer }) {
  const { url: homeUrl } = href('Home', route)
  const NavLink = createNavLink(route)
  return (
    <nav className='navbar navbar-light'>
      <div className='container'>
        <a className='navbar-brand' href={homeUrl}>
          conduit
        </a>
        <ul className='nav navbar-nav pull-xs-right'>
          {viewer ? (
            <React.Fragment>
              <NavLink route='Home'>Home</NavLink>
              <NavLink route='ArticleCreate'>
                <i className='ion-compose' />&nbsp;New Post
              </NavLink>
              <NavLink route='Settings'>
                <i className='ion-gear-a' />&nbsp;Settings
              </NavLink>
              <NavLink
                route='Profile'
                routeParams={{ username: viewer.username }}
              >
                <img
                  className='user-pic'
                  alt={viewer.username}
                  src={
                    viewer.pic ||
                    'https://static.productionready.io/images/smiley-cyrus.jpg'
                  }
                />
                &nbsp;
                {viewer.username}
              </NavLink>
              <NavLink route='Logout'>Sign out</NavLink>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <NavLink route='Home'>Home</NavLink>
              <NavLink route='Login'>Sign in</NavLink>
              <NavLink route='Register'>Sign up</NavLink>
            </React.Fragment>
          )}
        </ul>
      </div>
    </nav>
  )
}
