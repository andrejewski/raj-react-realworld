import React from 'react'
import { withSubscriptions, mapSubscription } from 'raj-subscription'
import { assembleProgram, mapEffect, batchEffects } from 'raj-compose'
import { union } from 'tagmeme'
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

const data = ({
  remote: {
    watchViewer,
    getArticles,
    getFeedArticles,
    favoriteArticle,
    unfavoriteArticle,
    getTags
  }
}) => ({
  watchViewer,
  getArticles,
  getFeedArticles,
  favoriteArticle,
  unfavoriteArticle,
  getTags
})

const Msg = union([
  'SelectTag',
  'SelectFeed',
  'SelectGlobal',
  'SetTags',
  'SetViewer',
  'SetArticles',
  'SetPageIndex',
  'FavoriteArticle',
  'FavoritedArticle'
])

function logic (data) {
  function fetchEffect (tab, tag, query) {
    if (tab === 'global') {
      return data.getArticles(query)
    }
    if (tab === 'feed') {
      return data.getFeedArticles(query)
    }
    return data.getArticles({ ...query, tag })
  }

  function fetchForTab ({ tab, tag, pageIndex }) {
    const pageSize = 10
    const query = { limit: pageSize, offset: pageIndex * pageSize }
    return mapEffect(fetchEffect(tab, tag, query), Msg.SetArticles)
  }

  function fetch (model, effect) {
    return [model, batchEffects([effect, fetchForTab(model)])]
  }

  const init = fetch(
    {
      viewer: null,
      tab: 'global', // | feed | tag
      tag: null,
      tags: [],
      pageIndex: 0,
      articleCount: 0,
      articles: []
    },
    mapEffect(data.getTags(), Msg.SetTags)
  )

  const reset = { tag: null, pageIndex: 0 }

  function update (msg, model) {
    return Msg.match(msg, {
      SelectTag: tag => fetch({ ...model, ...reset, tab: 'tag', tag }),
      SelectFeed: () => fetch({ ...model, ...reset, tab: 'feed' }),
      SelectGlobal: () => fetch({ ...model, ...reset, tab: 'global' }),
      SetTags: ({ data: tags }) => [{ ...model, tags }],
      SetViewer: viewer => [{ ...model, viewer }],
      SetArticles: ({ error, data }) =>
        error
          ? [model]
          : [
            {
              ...model,
              articles: data.articles,
              articleCount: data.articlesCount
            }
          ],
      SetPageIndex: pageIndex => fetch({ ...model, pageIndex }),
      FavoriteArticle: articleSlug => {
        const article = model.articles.find(
          article => article.slug === articleSlug
        )
        return [
          model,
          mapEffect(
            article.favorited
              ? data.unfavoriteArticle({ slug: articleSlug })
              : data.favoriteArticle({ slug: articleSlug }),
            Msg.FavoritedArticle
          )
        ]
      },
      FavoritedArticle: ({ error, data: newArticle }) =>
        error
          ? []
          : [
            {
              ...model,
              articles: model.articles.map(
                article =>
                  article.slug === newArticle.slug ? newArticle : article
              )
            }
          ]
    })
  }

  const subscriptions = () => ({
    viewer: () => mapSubscription(data.watchViewer(), Msg.SetViewer)
  })

  return { init, update, subscriptions }
}

function TabLink ({ isActive, onClick, children }) {
  return (
    <li className='nav-item'>
      <a
        {...{
          className: isActive ? 'nav-link active' : 'nav-link',
          onClick: () => onClick(),
          href: 'javascript:void(0);'
        }}
      >
        {children}
      </a>
    </li>
  )
}

function timestamp (dateLike) {
  const date = new Date(dateLike)
  const month = date.toLocaleString('en-us', { month: 'long' })
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

function view (model, dispatch) {
  return (
    <div className='home-page'>
      <div className='banner'>
        <div className='container'>
          <h1 className='logo-font'>conduit</h1>
          <p>A place to share your knowledge.</p>
        </div>
      </div>

      <div className='container page'>
        <div className='row'>
          <div className='col-md-9'>
            <div className='feed-toggle'>
              <ul className='nav nav-pills outline-active'>
                {model.viewer && (
                  <TabLink
                    {...{
                      isActive: model.tab === 'feed',
                      onClick: () => dispatch(Msg.SelectFeed()),
                      children: 'Your Feed'
                    }}
                  />
                )}
                <TabLink
                  {...{
                    isActive: model.tab === 'global',
                    onClick: () => dispatch(Msg.SelectGlobal()),
                    children: 'Global Feed'
                  }}
                />
                {model.tag && (
                  <TabLink
                    {...{
                      isActive: model.tab === 'tag',
                      onClick: () => {},
                      children: `#${model.tag}`
                    }}
                  />
                )}
              </ul>
            </div>

            {model.articles.map(article => {
              const authorProfileUrl = getURLForRoute(
                Route.Profile({
                  routeParams: { username: article.author.username }
                })
              )
              const articleUrl = getURLForRoute(
                Route.ArticleView({
                  routeParams: { articleSlug: article.slug }
                })
              )
              return (
                <div key={article.slug} className='article-preview'>
                  <div className='article-meta'>
                    <a href={authorProfileUrl}>
                      <img
                        {...{
                          src:
                            article.author.image ||
                            'https://static.productionready.io/images/smiley-cyrus.jpg',
                          alt: article.author.username
                        }}
                      />
                    </a>
                    <div className='info'>
                      <a href={authorProfileUrl} className='author'>
                        {article.author.username}
                      </a>
                      <span className='date'>
                        {timestamp(article.createdAt)}
                      </span>
                    </div>
                    <button
                      {...{
                        className: `btn ${
                          article.favorited
                            ? 'btn-primary'
                            : 'btn-outline-primary'
                        } btn-sm pull-xs-right`,
                        onClick: () =>
                          dispatch(Msg.FavoriteArticle(article.slug))
                      }}
                    >
                      <i className='ion-heart' /> {article.favoritesCount}
                    </button>
                  </div>
                  <a href={articleUrl} className='preview-link'>
                    <h1>{article.title}</h1>
                    <p>{article.description}</p>
                    <span>Read more...</span>
                  </a>
                </div>
              )
            })}
          </div>

          <div className='col-md-3'>
            {model.tags.length > 0 && (
              <div className='sidebar'>
                <p>Popular Tags</p>

                <div className='tag-list'>
                  {model.tags.map(tag => (
                    <a
                      {...{
                        key: tag,
                        href: 'javascript:void(0);',
                        onClick: () => dispatch(Msg.SelectTag(tag)),
                        className: 'tag-pill tag-default'
                      }}
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
