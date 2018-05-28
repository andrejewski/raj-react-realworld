import qs from 'querystring'

const authTokenKey = 'authToken'
const store = {
  getAuthToken: () => window.localStorage.getItem(authTokenKey),
  setAuthToken: token => {
    window.localStorage.setItem(authTokenKey, token)
  },
  deleteAuthToken: () => {
    window.localStorage.removeItem(authTokenKey)
  }
}

const network = {
  sendRequest: ({ method, url, query, body, headers }) =>
    fetch(query ? `${url}?${qs.stringify(query)}` : url, {
      method,
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', ...headers }
    }).then(res => res.json())
}

function resultFromPromise (promise, dispatch) {
  promise.then(data => dispatch({ data })).catch(error => dispatch({ error }))
}

function getAuthHeaders (store) {
  const token = store.getAuthToken()
  if (token) {
    return { authorization: `Token ${token}` }
  }
}

function createRemote ({
  baseUrl,
  store,
  network,
  currentViewer,
  viewerListeners = []
}) {
  function mutation (handler, transform) {
    const baseHeaders = getAuthHeaders(store)
    return props => dispatch => {
      const [method, path, query, body, headers] = handler(props)
      const promise = network.sendRequest({
        method: method,
        url: baseUrl + path,
        query,
        body,
        headers: { ...baseHeaders, ...headers }
      })
      return resultFromPromise(promise.then(transform || (x => x)), dispatch)
    }
  }

  function setViewer (viewer) {
    currentViewer = viewer
    viewerListeners.forEach(listener => listener(viewer))
  }

  function setViewerAndToken (response) {
    setViewer(response.user)
    store.setAuthToken(response.user.token)
    return response
  }

  const getViewer = mutation(
    () => ['get', '/user'],
    res => {
      setViewer(res.user)
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
      store.deleteAuthToken()
      setViewer(null)
    },

    // Viewer

    getViewer,

    watchViewer: () => {
      let listener
      return {
        effect (dispatch) {
          listener = dispatch
          viewerListeners.push(listener)

          const shouldLoad = !currentViewer && store.getAuthToken()
          if (shouldLoad) {
            const ignorePayload = () => {}
            getViewer(ignorePayload)
          }

          dispatch(currentViewer)
        },
        cancel () {
          viewerListeners = viewerListeners.filter(l => l !== listener)
        }
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

    getUser: mutation(({ username }) => ['get', `/profiles/${username}`]),

    followUser: mutation(({ username }) => [
      'post',
      `/profiles/${username}/follow`
    ]),

    unfollowUser: mutation(({ username }) => [
      'delete',
      `/profiles/${username}/follow`
    ]),

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

    favoriteArticle: mutation(({ slug }) => [
      'post',
      `/articles/${slug}/favorite`
    ]),

    unfavoriteArticle: mutation(({ slug }) => [
      'delete',
      `/articles/${slug}/favorite`
    ]),

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

    getTags: mutation(() => ['get', '/tags'])
  }
}

export function createSimpleRemote ({ baseUrl }) {
  return createRemote({ baseUrl, store, network })
}
