import React from 'react'
import { withSubscriptions, mapSubscription } from 'raj-subscription'
import { assembleProgram, mapEffect, batchEffects } from 'raj-compose'
import { union } from 'tagmeme'
import { userPicture, timestamp, Form, Markdown } from '../views'
import { getURLForRoute, Route } from '../routing'
import { withErrors, handleError } from '../errors'

export function makeProgram ({ dataOptions, articleSlug }) {
  return withSubscriptions(
    withErrors(
      assembleProgram({
        data,
        dataOptions,
        logic,
        logicOptions: { articleSlug },
        view
      })
    )
  )
}

const data = ({
  router: { emit },
  remote: {
    watchViewer,
    getUser,
    getArticle,
    deleteArticle,
    favoriteArticle,
    unfavoriteArticle,
    followUser,
    unfollowUser,
    getArticleComments,
    createArticleComment,
    deleteArticleComment
  }
}) => ({
  watchViewer,
  getUser,
  getArticle,
  deleteArticle,
  favoriteArticle,
  unfavoriteArticle,
  followUser,
  unfollowUser,
  getArticleComments,
  createArticleComment,
  deleteArticleComment,
  goHome: emit(Route.Home({}))
})

const Msg = union([
  'SetViewer',
  'SetArticle',
  'SetArticleComments',
  'FavoriteArticle',
  'FavoritedArticle',
  'DeleteArticle',
  'DeletedArticle',
  'FollowUser',
  'FollowedUser',
  'SetComment',
  'SaveComment',
  'SavedComment',
  'DeleteComment',
  'DeletedComment'
])

function logic (data, { articleSlug }) {
  const init = [
    {
      viewer: null,
      article: null,
      comments: [],
      comment: ''
    },
    batchEffects([
      mapEffect(data.getArticle({ slug: articleSlug }), Msg.SetArticle),
      mapEffect(
        data.getArticleComments({ slug: articleSlug }),
        Msg.SetArticleComments
      )
    ])
  ]

  function update (msg, model) {
    return Msg.match(msg, {
      SetViewer: viewer => [{ ...model, viewer }],
      SetArticle: ({ error, data: article }) =>
        (error
          ? [handleError(model, error, { pageName: 'article' })]
          : [{ ...model, article }]),
      SetArticleComments: ({ error, data: comments }) =>
        (error
          ? [
            handleError(model, error, {
              attemptedAction: 'load article comments'
            })
          ]
          : [{ ...model, comments }]),
      FavoriteArticle: () => [
        model,
        mapEffect(
          model.article.favorited
            ? data.unfavoriteArticle({ slug: articleSlug })
            : data.favoriteArticle({ slug: articleSlug }),
          Msg.FavoritedArticle
        )
      ],
      FavoritedArticle: ({ error, data: article }) =>
        (error
          ? [handleError(model, error, { attemptedAction: 'favorite' })]
          : [{ ...model, article }]),
      DeleteArticle: () => [
        model,
        mapEffect(
          data.deleteArticle({ slug: articleSlug }),
          Msg.DeletedArticle
        )
      ],
      DeletedArticle: ({ error }) =>
        (error
          ? [handleError(model, error, { attemptedAction: 'delete' })]
          : [model, data.goHome]),
      FollowUser: () => {
        const { article: { author } } = model
        const username = author.username
        const followEffect = author.following
          ? data.unfollowUser({ username })
          : data.followUser({ username })
        return [model, mapEffect(followEffect, Msg.FollowedUser)]
      },
      FollowedUser: ({ error, data: author }) =>
        (error
          ? [handleError(model, error, { attemptedAction: 'follow' })]
          : [{ ...model, article: { ...model.article, author } }]),
      SetComment: comment => [{ ...model, comment }],
      SaveComment: () => [
        model,
        mapEffect(
          data.createArticleComment({ slug: articleSlug, body: model.comment }),
          Msg.SavedComment
        )
      ],
      SavedComment: ({ error, data: comment }) =>
        (error
          ? [handleError(model, error, { attemptedAction: 'comment' })]
          : [
            {
              ...model,
              comment: '',
              comments: [comment].concat(model.comments)
            }
          ]),
      DeleteComment: commentId => [
        model,
        mapEffect(
          data.deleteArticleComment({ slug: articleSlug, commentId }),
          result => Msg.DeletedComment({ ...result, commentId })
        )
      ],
      DeletedComment: ({ error, commentId }) =>
        (error
          ? [handleError(model, error, { attemptedAction: 'delete' })]
          : [
            {
              ...model,
              comments: model.comments.filter(c => c.id !== commentId)
            }
          ])
    })
  }

  const subscriptions = () => ({
    viewer: () => mapSubscription(data.watchViewer(), Msg.SetViewer)
  })

  return { init, update, subscriptions }
}

function ArticleMeta ({
  article,
  isViewerAuthor,
  onDelete,
  onFollow,
  onFavorite
}) {
  const { author } = article
  const authorURL = getURLForRoute(
    Route.Profile({ routeParams: { username: author.username } })
  )
  const articleEditURL = getURLForRoute(
    Route.ArticleEdit({ routeParams: { articleSlug: article.slug } })
  )
  return (
    <div className='article-meta'>
      <a href={authorURL}>
        <img alt={author.username} src={userPicture(author.image)} />
      </a>
      <div className='info'>
        <a href={authorURL} className='author'>{author.username}</a>
        <span className='date'>{timestamp(article.createdAt)}</span>
      </div>
      {isViewerAuthor
        ? <React.Fragment>
          <a
            className='btn btn-outline-secondary btn-sm'
            href={articleEditURL}
            >
            <i className='ion-edit' /> Edit Article
            </a>
            &nbsp;
          <button
            className='btn btn-outline-danger btn-sm'
            onClick={() => onDelete()}
            >
            <i className='ion-trash-a' /> Delete Article
            </button>
        </React.Fragment>
        : <React.Fragment>
          <button
            className='btn btn-sm btn-outline-secondary'
            onClick={() => onFollow()}
            >
            <i className='ion-plus-round' />
              &nbsp;
            {author.following ? 'Unfollow' : 'Follow'} {author.username}
          </button>
            &nbsp;
          <button
            className='btn btn-sm btn-outline-primary'
            onClick={() => onFavorite()}
            >
            <i className='ion-heart' />
              &nbsp;
            {article.favorited ? 'Unfavorite' : 'Favorite'}
            {' '}
              Article (
              {article.favoritesCount}
              )
            </button>
        </React.Fragment>}
    </div>
  )
}

function view (model, dispatch) {
  const { viewer, article } = model
  if (!article) {
    return
  }

  const { author } = article
  const isViewerAuthor = viewer && viewer.username === author.username
  const signInURL = getURLForRoute(Route.Login({}))
  const signUpURL = getURLForRoute(Route.Register({}))
  const metaProps = {
    article,
    isViewerAuthor,
    onFollow: () => dispatch(Msg.FollowUser()),
    onFavorite: () => dispatch(Msg.FavoriteArticle()),
    onDelete: () => dispatch(Msg.DeleteArticle())
  }

  return (
    <div className='article-page'>
      <div className='banner'>
        <div className='container'>
          <h1>{article.title}</h1>
          <ArticleMeta {...metaProps} />
        </div>
      </div>

      <div className='container page'>
        <div className='row article-content'>
          <div className='col-md-12'>
            <Markdown source={article.body} />
          </div>
        </div>

        <hr />

        <div className='article-actions'>
          <ArticleMeta {...metaProps} />
        </div>

        <div className='row'>
          <div className='col-xs-12 col-md-8 offset-md-2'>
            {viewer
              ? <Form
                className='card comment-form'
                onSubmit={() => dispatch(Msg.SaveComment())}
                >
                <div className='card-block'>
                  <textarea
                    className='form-control'
                    placeholder='Write a comment...'
                    required
                    rows='3'
                    value={model.comment}
                    onChange={event => {
                      dispatch(Msg.SetComment(event.target.value))
                    }}
                    />
                </div>

                <div className='card-footer'>
                  <img
                    alt={viewer.username}
                    src={userPicture(viewer.image)}
                    className='comment-author-img'
                    />
                  <button className='btn btn-sm btn-primary'>
                      Post Comment
                    </button>
                </div>
              </Form>
              : <p>
                <a href={signInURL}>Sign in</a>
                {' or '}
                <a href={signUpURL}>sign up</a>
                {' to add comments on this article.'}
              </p>}

            {model.comments.map(comment => {
              const authorURL = getURLForRoute(
                Route.Profile({
                  routeParams: { username: comment.author.username }
                })
              )
              const canDeleteComment =
                viewer && viewer.username === comment.author.username
              return (
                <div key={comment.id} className='card'>
                  <div className='card-block'>
                    <p className='card-text'>
                      {comment.body}
                    </p>
                  </div>
                  <div className='card-footer'>
                    <a href={authorURL} className='comment-author'>
                      <img
                        alt={author.username}
                        src={userPicture(author.image)}
                        className='comment-author-img'
                      />
                    </a>
                    &nbsp;
                    <a href={authorURL} className='comment-author'>
                      {comment.author.username}
                    </a>
                    <span className='date-posted'>
                      {timestamp(comment.createdAt)}
                    </span>
                    {canDeleteComment &&
                      <span className='mod-options'>
                        <i
                          className='ion-trash-a'
                          onClick={() =>
                            dispatch(Msg.DeleteComment(comment.id))}
                        />
                      </span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
