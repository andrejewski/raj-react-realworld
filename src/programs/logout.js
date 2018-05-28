import { assembleProgram, batchEffects } from 'raj-compose'
import { Route } from '../routing'

export function makeProgram ({ dataOptions }) {
  return assembleProgram({
    data,
    dataOptions,
    logic,
    view: () => {}
  })
}

const data = ({ router: { emit }, remote: { signOut } }) => ({
  exit: () => batchEffects([emit(Route.Home({})), signOut])
})

const logic = data => ({
  init: [undefined, data.exit()],
  update: () => []
})
