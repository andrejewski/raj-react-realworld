import React from 'react'
import { union } from 'tagmeme'
import { withSubscriptions, mapSubscription } from 'raj-subscription'
import { assembleProgram, mapEffect } from 'raj-compose'
import { Form, TextBox } from '../views'
import { Route } from '../routing'
import {
  withErrors,
  handleError,
  ValidationErrors,
  AuthenticationGuard,
  SimplePage
} from '../errors'

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
  remote: { watchViewer, getArticle, createArticle, updateArticle }
}) => ({
  watchViewer,
  getArticle,
  createArticle,
  updateArticle,
  gotoArticleEdit: articleSlug =>
    emit(Route.ArticleEdit({ routeParams: { articleSlug } }))
})

function makeForm (article) {
  return article
    ? {
      title: article.title,
      description: article.description || '',
      body: article.body || '',
      tags: article.tagList ? article.tagList.join(' ') : ''
    }
    : {
      title: '',
      description: '',
      body: '',
      tags: ''
    }
}

const Msg = union([
  'SetTitle',
  'SetDescription',
  'SetBody',
  'SetTags',
  'SetViewer',
  'SetArticle',
  'SaveArticle',
  'SavedArticle'
])

function getTagList (tagInput) {
  return tagInput.split(' ').map(t => t.trim()).filter(x => x)
}

function logic (data, { articleSlug }) {
  const init = [
    {
      isCreating: !articleSlug,
      viewer: null,
      article: null,
      ...makeForm()
    },
    articleSlug &&
      mapEffect(data.getArticle({ slug: articleSlug }), Msg.SetArticle)
  ]

  function update (msg, model) {
    return Msg.match(msg, {
      SetTitle: title => [{ ...model, title }],
      SetDescription: description => [{ ...model, description }],
      SetBody: body => [{ ...model, body }],
      SetTags: tags => [{ ...model, tags }],
      SetViewer: viewer => [{ ...model, viewer }],
      SetArticle: ({ error, data: article }) =>
        (error ? [model] : [{ ...model, article, ...makeForm(article) }]),
      SaveArticle: () => {
        const { title, description, body, tags } = model
        const tagList = getTagList(tags)
        const savePayload = {
          slug: articleSlug,
          title,
          description,
          body,
          tagList
        }
        const saveEffect = model.isCreating
          ? data.createArticle(savePayload)
          : data.updateArticle(savePayload)
        return [model, mapEffect(saveEffect, Msg.SavedArticle)]
      },
      SavedArticle: ({ error, data: article }) =>
        (error
          ? [handleError(model, error, { attemptedAction: 'save article' })]
          : [model, data.gotoArticleEdit(article.slug)])
    })
  }

  const subscriptions = () => ({
    viewer: () => mapSubscription(data.watchViewer(), Msg.SetViewer)
  })

  return { init, update, subscriptions }
}

function EditGuard ({ canEditArticle, children }) {
  return canEditArticle
    ? children
    : <SimplePage
      {...{
        title: 'Error loading article',
        description: 'Only the author of this article can edit it.'
      }}
      />
}

function view (model, dispatch) {
  const authorUsername = model.article && model.article.author.username
  const viewerUsername = model.viewer && model.viewer.username
  const canEditArticle =
    !authorUsername || (viewerUsername && viewerUsername === authorUsername)

  return (
    <AuthenticationGuard
      isAuthenticated={model.viewer}
      pageName='editor'
      pageAction='create and edit articles'
    >
      <EditGuard canEditArticle={canEditArticle}>
        <div className='settings-page'>
          <div className='container page'>
            <div className='row'>
              <div className='col-md-10 offset-md-1 col-xs-12'>
                <ValidationErrors {...model} />
                <Form onSubmit={() => dispatch(Msg.SaveArticle())}>
                  <fieldset>
                    <TextBox
                      {...{
                        isLarge: true,
                        placeholder: 'Article title',
                        value: model.title,
                        onValue (value) {
                          dispatch(Msg.SetTitle(value))
                        }
                      }}
                    />
                    <TextBox
                      {...{
                        placeholder: "What's this article about?",
                        value: model.description,
                        onValue (value) {
                          dispatch(Msg.SetDescription(value))
                        }
                      }}
                    />
                    <TextBox
                      {...{
                        isMultiLine: true,
                        placeholder: 'Write your article (in markdown)',
                        value: model.body,
                        onValue (value) {
                          dispatch(Msg.SetBody(value))
                        }
                      }}
                    />
                    <TextBox
                      {...{
                        placeholder: 'Enter tags',
                        value: model.tags,
                        onValue (value) {
                          dispatch(Msg.SetTags(value))
                        }
                      }}
                    />
                    <button className='btn btn-lg btn-primary pull-xs-right'>
                      {model.isCreating ? 'Publish Article' : 'Update Article'}
                    </button>
                  </fieldset>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </EditGuard>
    </AuthenticationGuard>
  )
}
