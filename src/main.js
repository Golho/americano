import './style.css'
import Alpine from 'alpinejs'
import { tournamentApp } from './tournament-app.js'

Alpine.data('tournamentApp', () => Object.defineProperties({}, Object.getOwnPropertyDescriptors(tournamentApp)))
Alpine.start()
