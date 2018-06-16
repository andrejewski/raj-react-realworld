# ![RealWorld Example App](logo.png)

> ### [React](https://reactjs.org/) and [Raj](https://jew.ski/raj/) codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the [RealWorld](https://github.com/gothinkster/realworld) spec and API.

### [Demo](https://andrejewski.github.io/raj-react-realworld/)&nbsp;&nbsp;&nbsp;&nbsp;[RealWorld](https://github.com/gothinkster/realworld)


This codebase was created to demonstrate a fully fledged fullstack application built with **[React](https://reactjs.org/)** and **[Raj](https://jew.ski/raj/)** including CRUD operations, authentication, routing, pagination, and more.

We've gone to great lengths to adhere to the Raj community best practices.

For more information on how to this works with other frontends/backends, head over to the [RealWorld](https://github.com/gothinkster/realworld) repo.


# How it works

This is a Create React App app. The code lives mainly in `src`:

- `programs` has the application pages and the navigation header
- `routing` contains the router and utilities for handling links and navigation
- `remote` handles the API business
- `views` contains the shared view components
- `errors` contains the error handling

Notes:

- Side-effects are pushed to the edge of the system.
  The asynchronous code lives in the `remote` and `router` services.
  These can be swapped out with dummy services in testing.

- Error handling is accomplished with a high-order-program (HOP).
  We wrap each program and the `withErrors` program manages the UI bits.
  This works because errors are not too important in RealWorld.
  An app with i18n requirements would have a fair amount of hand rolled error handling.

- The links and routes are not hard-coded.
  We can rename routing table entries and everything would still work.
  Using push-state would require little changes.

- There are quite a few ways to write a REST API integration.
  The `remote` contains everything, but effects can be fragmented and local to programs.
  The approach taken here is good, not gospel.

  We do not request the user on every page transition.
  The `remote` has internal state for caching the current user.
  Since this state is hidden from the application code, it is fine.

# Getting started

```sh
yarn install

# development
yarn start

# build
yarn run build
```
