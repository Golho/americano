import './style.css'
import { tournamentApp } from './tournament-app.js'

document.addEventListener('alpine:init', () => {
  Alpine.data('tournamentApp', () => Object.defineProperties({}, Object.getOwnPropertyDescriptors(tournamentApp)))
})
