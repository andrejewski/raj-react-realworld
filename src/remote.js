import qs from 'querystring'

function createTokenStore ({ storage, storageKey }) {
  return {
    getToken: () => storage.getItem(storageKey),
    setToken: token => {
      storage.setItem(storageKey, token)
    },
    deleteToken () {
      storage.removeItem(storageKey)
    }
  }
}

const createNetwork = ({ fetch }) => ({
  sendRequest: ({ method, url, query, body, headers }) =>
    fetch(query ? `${url}?${qs.stringify(query)}` : url, {
      method,
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', ...headers }
    }).then(res => res.json())
})

function createAtom (value) {
  let listeners = []
  return {
    getValue: () => value,
    updateValue (updateFn) {
      value = updateFn(value)
      listeners.forEach(l => l(value))
    },
    getSubscription () {
      let listener
      return {
        effect (dispatch) {
          listener = dispatch
          listeners.push(listener)
          listener(value)
        },
        cancel () {
          listeners = listeners.filter(l => l !== listener)
        }
      }
    }
  }
}

function createAlertService ({ defaultAlerts }) {
  const atom = createAtom(defaultAlerts)
  return {
    watchAlerts: atom.getSubscription,
    addAlert: ({ key, type, title, description }) => {
      atom.updateValue(alerts =>
        alerts
          .filter(alert => alert.key !== key)
          .shift({ key, type, title, description })
      )
    },

    removeAlert: ({ key }) => {
      atom.updateValue(alerts => alerts.filter(alert => alert.key !== key))
    }
  }
}

function resultFromPromise (promise, dispatch) {
  return promise
    .then(data => dispatch({ data }))
    .catch(error => dispatch({ error }))
}

function createAPI ({ baseUrl, tokenStore, network, alerts }) {
  function mutation (getRequestFromProps, transform) {
    return props => dispatch => {
      const token = tokenStore.getToken()
      const baseHeaders = token && { authorization: `Token ${token}` }
      const [method, path, query, body, headers] = getRequestFromProps(props)
      const responsePromise = network.sendRequest({
        url: baseUrl + path,
        method,
        query,
        body,
        headers: { ...baseHeaders, ...headers }
      })

      const payloadPromise = responsePromise
        .catch(error => {
          // TODO: create global alerts for network/auth errors
          // TODO: coerce validation errors into an interface
          throw error
        })
        .then(transform || (x => x))

      return resultFromPromise(payloadPromise, dispatch)
    }
  }

  const viewerAtom = createAtom(null)

  function setViewer (res) {
    viewerAtom.updateValue(() => res.user)
  }

  function setViewerAndToken (response) {
    setViewer(response)
    tokenStore.setToken(response.user.token)
    return response
  }

  const getViewer = mutation(
    () => ['get', '/user'],
    res => {
      setViewer(res)
      return res
    }
  )()

  const asEffect = fn => (...args) => () => fn(...args)

  return {
    // Alerts
    watchAlerts: alerts.watchAlerts,
    addAlert: asEffect(alerts.addAlert),
    removeAlert: asEffect(alerts.removeAlert),

    // Authentication
    signIn: mutation(
      ({ email, password }) => [
        'post',
        '/users/login',
        null,
        { user: { email, password } }
      ],
      setViewerAndToken
    ),

    signUp: mutation(
      ({ email, password, username }) => [
        'post',
        '/users',
        null,
        { user: { email, password, username } }
      ],
      setViewerAndToken
    ),

    signOut: () => {
      tokenStore.deleteToken()
      setViewer({ viewer: null })
    },

    // Viewer
    watchViewer: () => {
      const { effect, cancel } = viewerAtom.getSubscription()
      return {
        effect (dispatch) {
          const shouldLoad = !viewerAtom.getValue() && tokenStore.getToken()
          if (shouldLoad) {
            const ignorePayload = () => {}
            getViewer(ignorePayload)
          }

          effect(dispatch)
        },
        cancel
      }
    },

    updateViewer: mutation(
      ({ username, email, bio, password, image }) => [
        'put',
        '/user',
        null,
        { user: { username, email, bio, password, image } }
      ],
      setViewer
    ),

    // Users
    getUser: mutation(
      ({ username }) => ['get', `/profiles/${username}`],
      resp => resp && resp.profile
    ),

    followUser: mutation(
      ({ username }) => ['post', `/profiles/${username}/follow`],
      resp => resp && resp.profile
    ),

    unfollowUser: mutation(
      ({ username }) => ['delete', `/profiles/${username}/follow`],
      resp => resp && resp.profile
    ),

    // Articles
    getArticle: mutation(({ slug }) => ['get', `/articles/${slug}`]),

    getArticles: mutation(({ tag, author, favorited, limit, offset }) => [
      'get',
      '/articles',
      { tag, author, favorited, limit, offset }
    ]),

    getFeedArticles: mutation(({ tag, author, favorited, limit, offset }) => [
      'get',
      '/articles/feed',
      { tag, author, favorited, limit, offset }
    ]),

    createArticle: mutation(({ title, description, body, tagList }) => [
      'post',
      '/articles',
      null,
      { article: { title, description, body, tagList } }
    ]),

    updateArticle: mutation(({ slug, title, description, body }) => [
      'put',
      `/articles/${slug}`,
      null,
      { article: { title, description, body } }
    ]),

    deleteArticle: mutation(({ slug }) => ['delete', `/articles/${slug}`]),

    favoriteArticle: mutation(
      ({ slug }) => ['post', `/articles/${slug}/favorite`],
      resp => resp && resp.article
    ),

    unfavoriteArticle: mutation(
      ({ slug }) => ['delete', `/articles/${slug}/favorite`],
      resp => resp && resp.article
    ),

    // Comments
    getArticleComments: mutation(({ slug }) => [
      'get',
      `/articles/${slug}/comments`
    ]),

    createArticleComment: mutation(({ slug, body }) => [
      'post',
      `/articles/${slug}/comments`,
      null,
      { comment: { body } }
    ]),

    deleteArticleComment: mutation(({ slug, commentId }) => [
      'delete',
      `/articles/${slug}/comments/${commentId}`
    ]),

    // Tags
    getTags: mutation(() => ['get', '/tags'], resp => resp && resp.tags)
  }
}

export function createRemote ({
  baseUrl,
  defaultAlerts = [],
  fetch = window.fetch,
  storage = window.localStorage,
  storageKey = 'authToken'
}) {
  const alerts = createAlertService({ defaultAlerts })
  const network = createNetwork({ fetch })
  const tokenStore = createTokenStore({ storage, storageKey })
  return createAPI({ baseUrl, alerts, network, tokenStore })
}
