import React from 'react'
import { withSubscriptions, mapSubscription } from 'raj-subscription'
import { assembleProgram, mapEffect, batchEffects } from 'raj-compose'
import { union } from 'tagmeme'
import { ArticleList, TabList, userPicture } from '../views'

export function makeProgram ({ dataOptions, username }) {
  return withSubscriptions(
    assembleProgram({
      data,
      dataOptions,
      logic,
      logicOptions: { username },
      view
    })
  )
}

const data = ({
  remote: {
    watchViewer,
    getUser,
    getArticles,
    favoriteArticle,
    unfavoriteArticle,
    followUser,
    unfollowUser
  }
}) => ({
  watchViewer,
  getUser,
  getArticles,
  favoriteArticle,
  unfavoriteArticle,
  followUser,
  unfollowUser
})

const Msg = union([
  'SelectAuthored',
  'SelectFavorited',
  'SetViewer',
  'SetUser',
  'SetArticles',
  'SetPageIndex',
  'FavoriteArticle',
  'FavoritedArticle',
  'FollowUser',
  'FollowedUser'
])

function logic (data, { username }) {
  function makeTabFetch ({ tab, pageIndex }) {
    const pageSize = 10
    const tabQuery = tab === 'authored'
      ? { author: username }
      : { favorited: username }
    return mapEffect(
      data.getArticles({
        limit: pageSize,
        offset: pageIndex * pageSize,
        ...tabQuery
      }),
      Msg.SetArticles
    )
  }

  function fetch (model, effect) {
    return [model, batchEffects([effect, makeTabFetch(model)])]
  }

  const init = [
    {
      viewer: null,
      user: null,
      tab: 'authored', // | favorited
      pageIndex: 0,
      articleCount: 0,
      articles: []
    },
    mapEffect(data.getUser({ username }), Msg.SetUser)
  ]

  const reset = { pageIndex: 0 }

  function update (msg, model) {
    return Msg.match(msg, {
      SelectAuthored: tag => fetch({ ...model, ...reset, tab: 'authored' }),
      SelectFavorited: () => fetch({ ...model, ...reset, tab: 'favorited' }),
      SetViewer: viewer => [{ ...model, viewer }],
      SetUser: ({ error, data: user }) =>
        (error ? [model] : fetch({ ...model, user })),
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
          ]),
      FollowUser: () => {
        const isFollowing = model.user && model.user.following
        const followEffect = isFollowing
          ? data.unfollowUser({ username })
          : data.followUser({ username })
        return [model, mapEffect(followEffect, Msg.FollowedUser)]
      },
      FollowedUser: ({ error, data: user }) =>
        (error ? [model] : [{ ...model, user }])
    })
  }

  const subscriptions = () => ({
    viewer: () => mapSubscription(data.watchViewer(), Msg.SetViewer)
  })

  return { init, update, subscriptions }
}

function UserBanner ({ user, canViewerFollow, onFollow }) {
  return (
    <div className='user-info'>
      <div className='container'>
        <div className='row'>
          <div className='col-xs-12 col-md-10 offset-md-1'>
            <img
              alt={user.username}
              src={userPicture(user.image)}
              className='user-img'
            />
            <h4>{user.username}</h4>
            <p>{user.bio}</p>
            {canViewerFollow &&
              <button
                className='btn btn-sm btn-outline-secondary action-btn'
                onClick={() => onFollow()}
              >
                <i className='ion-plus-round' />
                &nbsp;
                {user.following ? 'Unfollow' : 'Follow'} {user.username}
              </button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function view (model, dispatch) {
  const { viewer, user } = model

  return (
    <div className='profile-page'>
      {user &&
        <UserBanner
          {...{
            user,
            canViewerFollow: !(viewer &&
              user &&
              viewer.username === user.username),
            onFollow: () => dispatch(Msg.FollowUser())
          }}
        />}

      <div className='container page'>
        <div className='row'>
          <div className='col-xs-12 col-md-10 offset-md-1'>
            <TabList
              {...{
                tabs: [
                  {
                    key: 'authored',
                    isActive: model.tab === 'authored',
                    onClick: () => dispatch(Msg.SelectAuthored()),
                    children: 'My Articles'
                  },
                  {
                    key: 'favorited',
                    isActive: model.tab === 'favorited',
                    onClick: () => dispatch(Msg.SelectFavorited()),
                    children: 'Favorited Articles'
                  }
                ]
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
        </div>
      </div>
    </div>
  )
}
