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
    })
      .then(res => {
        const safePayload = res.json().catch(() => ({}))
        return Promise.all([res.status, safePayload])
      })
      .then(([status, payload]) => ({ status, payload }))
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

function resultFromPromise (promise, dispatch) {
  return promise
    .then(data => dispatch({ data }))
    .catch(error => dispatch({ error }))
}

function makeUserError (message, type, data) {
  const error = new Error(message)
  error.type = type
  error.data = data
  return error
}

function findUserError (response) {
  switch (response.status) {
    case 401:
      return makeUserError('Unauthorized request', 'unauthorized')
    case 403:
      return makeUserError('Forbidden request', 'forbidden')
    case 404:
      return makeUserError('Not found', 'not-found')
    case 422:
      return makeUserError(
        'Validation error',
        'invalid',
        response.payload.errors
      )
    default:
      if (response.status >= 500) {
        return makeUserError('Server error', 'server-error')
      }
  }
}

function createAPI ({ baseUrl, tokenStore, network }) {
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
          throw makeUserError('Network error', 'network-error', error)
        })
        .then(response => {
          const error = findUserError(response)
          if (error) {
            throw error
          }
          return response.payload
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

  return {
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
    getArticle: mutation(
      ({ slug }) => ['get', `/articles/${slug}`],
      resp => resp && resp.article
    ),

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

    createArticle: mutation(
      ({ title, description, body, tagList }) => [
        'post',
        '/articles',
        null,
        { article: { title, description, body, tagList } }
      ],
      resp => resp && resp.article
    ),

    updateArticle: mutation(
      ({ slug, title, description, body }) => [
        'put',
        `/articles/${slug}`,
        null,
        { article: { title, description, body } }
      ],
      resp => resp && resp.article
    ),

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
    getArticleComments: mutation(
      ({ slug }) => ['get', `/articles/${slug}/comments`],
      resp => resp && resp.comments
    ),

    createArticleComment: mutation(
      ({ slug, body }) => [
        'post',
        `/articles/${slug}/comments`,
        null,
        { comment: { body } }
      ],
      resp => resp && resp.comment
    ),

    deleteArticleComment: mutation(
      ({ slug, commentId }) => [
        'delete',
        `/articles/${slug}/comments/${commentId}`
      ],
      resp => resp && resp.comment
    ),

    // Tags
    getTags: mutation(() => ['get', '/tags'], resp => resp && resp.tags)
  }
}

export function createRemote ({
  baseUrl,
  fetch = window.fetch,
  storage = window.localStorage,
  storageKey = 'authToken'
}) {
  const network = createNetwork({ fetch })
  const tokenStore = createTokenStore({ storage, storageKey })
  return createAPI({ baseUrl, network, tokenStore })
}
