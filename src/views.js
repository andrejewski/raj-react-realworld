import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Route, getURLForRoute } from './routing'

export const Markdown = ReactMarkdown

export class Form extends React.Component {
  render () {
    const { onSubmit, ...formProps } = this.props
    return (
      <form
        {...{
          ...formProps,
          onSubmit (event) {
            event.preventDefault()
            onSubmit()
          }
        }}
      />
    )
  }
}

export function TextBox ({
  isLarge,
  isMultiLine,
  isPassword,
  placeholder,
  value,
  onValue
}) {
  const inputProps = {
    className: isLarge ? 'form-control form-control-lg' : 'form-control',
    type: isPassword ? 'password' : 'text',
    placeholder,
    value,
    onChange (event) {
      onValue(event.target.value)
    }
  }

  return (
    <fieldset className='form-group'>
      {isMultiLine
        ? <textarea {...{ ...inputProps, rows: 8 }} />
        : <input {...inputProps} />}
    </fieldset>
  )
}

function TabLink ({ isActive, onClick, children }) {
  return (
    <li className='nav-item'>
      <a
        {...{
          className: isActive ? 'nav-link active' : 'nav-link',
          style: { cursor: 'pointer' },
          onClick
        }}
      >
        {children}
      </a>
    </li>
  )
}

export function userPicture (userImage) {
  return (
    userImage || 'https://static.productionready.io/images/smiley-cyrus.jpg'
  )
}

export function timestamp (dateLike) {
  const date = new Date(dateLike)
  const month = date.toLocaleString('en-us', { month: 'long' })
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

export function ArticleList ({ articles, onFavorite }) {
  return articles.map(article => {
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
              src={userPicture(article.author.image)}
              alt={article.author.username}
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
              className: `btn ${article.favorited ? 'btn-primary' : 'btn-outline-primary'} btn-sm pull-xs-right`,
              onClick: () => onFavorite(article.slug)
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
  })
}

export function TabList ({ tabs }) {
  return (
    <div className='feed-toggle'>
      <ul className='nav nav-pills outline-active'>
        {tabs.map(tab => <TabLink {...tab} />)}
      </ul>
    </div>
  )
}

const errorOverlayStyles = {
  position: 'fixed',
  top: '0',
  background: 'rgb(250, 250, 250)',
  padding: '20px',
  border: '1px solid'
}

export function ErrorOverlay ({ errors, onDismiss }) {
  if (errors.length) {
    return (
      <div style={errorOverlayStyles}>
        {errors.map(error => <p key={error}>{error}</p>)}
        <button onClick={() => onDismiss()}>Dismiss</button>
      </div>
    )
  }
}
