import { createRoutes } from 'tagged-routes'

const routes = createRoutes(
  {
    Home: '/',
    Login: '/login',
    Logout: '/logout',
    Register: '/register',
    Settings: '/settings',
    ArticleCreate: '/editor',
    ArticleEdit: '/editor/:articleSlug',
    ArticleView: '/article/:articleSlug',
    Profile: '/profile/:username',
    ProfileFavorites: '/profile/:username/favorites'
  },
  'NotFound'
)

export const Route = routes.Route

const urlPrefix = '/#'

export function getRouteForURL (url) {
  return routes.getRouteForURL(url.slice(urlPrefix.length))
}

export function getURLForRoute (route) {
  return urlPrefix + routes.getURLForRoute(route)
}

export const router = {
  emit: route => () => {
    window.location.hash = getURLForRoute(route).slice(urlPrefix.length)
  },

  subscribe () {
    let listener
    return {
      effect (dispatch) {
        listener = () =>
          dispatch(routes.getRouteForURL(window.location.hash.slice(1)))
        window.addEventListener('hashchange', listener)
        listener() // dispatch initial route
      },
      cancel () {
        window.removeEventListener('hashchange', listener)
      }
    }
  }
}
