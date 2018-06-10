import React from 'react'
import { withSubscriptions, mapSubscription } from 'raj-subscription'
import { assembleProgram, mapEffect, batchEffects } from 'raj-compose'
import { union } from 'tagmeme'
import { ArticleList, TabList } from '../views'

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
        (error
          ? [model]
          : [
            {
              ...model,
              articles: data.articles,
              articleCount: data.articlesCount
            }
          ]),
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
        (error
          ? [model]
          : [
            {
              ...model,
              articles: model.articles.map(
                  article =>
                    (article.slug === newArticle.slug ? newArticle : article)
                )
            }
          ])
    })
  }

  const subscriptions = () => ({
    viewer: () => mapSubscription(data.watchViewer(), Msg.SetViewer)
  })

  return { init, update, subscriptions }
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
            <TabList
              {...{
                tabs: [
                  model.viewer && {
                    key: 'feed',
                    isActive: model.tab === 'feed',
                    onClick: () => dispatch(Msg.SelectFeed()),
                    children: 'Your Feed'
                  },
                  {
                    key: 'global',
                    isActive: model.tab === 'global',
                    onClick: () => dispatch(Msg.SelectGlobal()),
                    children: 'Global Feed'
                  },
                  model.tag && {
                    key: 'tag',
                    isActive: model.tab === 'tag',
                    onClick: () => {},
                    children: `#${model.tag}`
                  }
                ].filter(x => x)
              }}
            />

            <ArticleList
              {...{
                articles: model.articles,
                onFavorite (articleSlug) {
                  dispatch(Msg.FavoriteArticle(articleSlug))
                }
              }}
            />
          </div>

          <div className='col-md-3'>
            {model.tags.length > 0 &&
              <div className='sidebar'>
                <p>Popular Tags</p>

                <div className='tag-list'>
                  {model.tags.map(tag => (
                    <a
                      {...{
                        key: tag,
                        onClick: event => {
                          event.preventDefault()
                          dispatch(Msg.SelectTag(tag))
                        },
                        className: 'tag-pill tag-default'
                      }}
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              </div>}
          </div>
        </div>
      </div>
    </div>
  )
}
