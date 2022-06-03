const {
  description
} = require('../../package');

let nav = [{
    text: 'Home',
    link: '/README.md',
    children:[{
      text: 'Quick Intro',
      link: '/introduction.md'
    }]
  }
]

module.exports = {
  title: 'Virail Env Server',
  description: description,
  head: [
    ['meta', { name: 'theme-color', content: '#e8478b' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],
  themeConfig: {
    repo: 'https://github.com/ibrahim-netto/virail-env-server',
    repoLabel: 'Github Repo',
    navbar: nav,
    sidebar: nav
  }
}