/**
 * Curated tag overlays for Lucide icons to bridge search discoverability gaps
 * and enrich icons that have few or zero tags upstream.
 * Keyed by icon kebab-case ID.
 */
export const ICON_TAG_OVERLAYS = {
  // Navigation & menu gaps
  'ellipsis-vertical': ['kebab', 'kebab menu', 'three dots', 'vertical dots', 'more options', 'more-vertical', 'overflow'],
  'ellipsis': ['meatball', 'meatball menu', 'horizontal dots', 'three dots', 'more options', 'more-horizontal'],
  'menu': ['hamburger', 'hamburger menu', 'drawer', 'navigation drawer', 'nav'],

  // Settings & config
  'settings': ['gears', 'cog', 'preferences', 'configuration', 'config', 'options'],
  'settings-2': ['gears', 'cog', 'preferences', 'configuration', 'config'],

  // Trash & delete
  'trash': ['dustbin', 'rubbish', 'garbage', 'bin', 'recycle bin'],
  'trash-2': ['dustbin', 'rubbish', 'garbage', 'bin', 'recycle bin'],

  // Auth & users
  'log-in': ['signin', 'sign-in', 'login', 'authenticate', 'enter'],
  'log-out': ['signout', 'sign-out', 'logout', 'exit'],
  'user-plus': ['signup', 'sign-up', 'register', 'create account', 'add user'],
  'user': ['avatar', 'profile', 'account', 'person'],
  'users': ['team', 'group', 'members', 'people'],

  // Viewport & window
  'maximize': ['maximise', 'fullscreen', 'expand'],
  'maximize-2': ['maximise', 'fullscreen', 'expand'],
  'minimize': ['minimise', 'exit fullscreen', 'collapse'],
  'minimize-2': ['minimise', 'exit fullscreen', 'collapse'],

  // Alignment & typography
  'text-align-center': ['align-center', 'centre', 'align center', 'center text'],
  'align-center-horizontal': ['centre', 'align-center', 'center horizontal'],
  'align-center-vertical': ['centre', 'align-center', 'center vertical'],

  // Charts & Analytics
  'chart-bar': ['bar chart', 'bar-chart', 'analyse', 'visualization', 'metric'],
  'chart-column': ['bar chart', 'column chart', 'histogram', 'analyse'],
  'chart-pie': ['pie chart', 'pie-chart', 'percentage', 'breakdown'],
  'chart-line': ['line chart', 'line-chart', 'trend', 'analytics'],

  // Travel, Navigation & Devices
  'navigation': ['satnav', 'satellite navigation', 'directions', 'gps', 'compass'],
  'navigation-2': ['satnav', 'satellite navigation', 'directions', 'gps'],
  'tv': ['telly', 'television', 'monitor', 'screen'],
  'tv-2': ['telly', 'television', 'monitor', 'screen'],

  // Data & files
  'table': ['csv', 'spreadsheet', 'excel', 'data grid', 'rows columns'],
  'sheet': ['csv', 'spreadsheet', 'excel', 'worksheet'],
  'file-text': ['pdf', 'doc', 'document', 'word', 'text file'],

  // Security
  'unlock': ['decrypt', 'de-crypt', 'unsecured', 'open lock'],
  'lock-open': ['decrypt', 'unsecured', 'access open'],
  'lock': ['encrypt', 'password', 'security', 'secure'],

  // Dev & networking
  'globe': ['endpoint', 'web service', 'internet', 'url', 'uri', 'web'],
  'webhook': ['endpoint', 'api', 'callback', 'http', 'integration'],
  'rocket': ['deploy', 'deployment', 'launch', 'release', 'ship'],
  'workflow': ['pipeline', 'ci cd', 'automation', 'continuous integration', 'actions'],
  'container': ['docker', 'kubernetes', 'k8s', 'pod', 'devops'],
  'git-branch': ['pipeline', 'version control', 'branching'],

  // Editing
  'pencil': ['modify', 'edit', 'update', 'write', 'change'],
  'edit': ['modify', 'update', 'change'],
  'edit-2': ['modify', 'update', 'change'],
  'edit-3': ['modify', 'update', 'change'],

  // Low-tag / zero-tag icons enrichments
  'hand-metal': ['rock', 'heavy metal', 'horns', 'gesture', 'devil', 'concert'],
  'inbox': ['email', 'messages', 'received', 'unread', 'mail'],
  'import': ['save', 'upload', 'bring in', 'load', 'file', 'receive'],
  'languages': ['translate', 'i18n', 'internationalization', 'locale', 'multilingual'],
  'move': ['drag', 'reposition', 'arrows', 'rearrange', 'pan'],
  'network': ['tree', 'connections', 'nodes', 'topology', 'graph', 'lan'],
  'phone': ['call', 'telephone', 'dial', 'ring', 'mobile'],
  'phone-call': ['ring', 'active call', 'dialing'],
  'phone-forwarded': ['call', 'divert', 'redirect'],
  'phone-incoming': ['call', 'receiving'],
  'phone-missed': ['call', 'unanswered'],
  'phone-outgoing': ['call', 'dialing'],
  'pointer': ['mouse', 'cursor', 'click', 'select'],
  'pointer-off': ['mouse', 'disabled', 'no cursor'],
  'quote': ['quotation', 'blockquote', 'cite', 'speech', 'saying'],
  'repeat-1': ['replay', 'loop', 'single', 'once'],
  'reply': ['email', 'respond', 'answer', 'message'],
  'reply-all': ['email', 'respond all', 'message'],
  'rewind': ['music', 'backward', 'fast backward', 'previous'],
  'save': ['floppy disk', 'store', 'persist', 'keep', 'record'],
  'tablet': ['device', 'ipad', 'screen', 'mobile'],
  'upload': ['file', 'send', 'publish', 'deploy', 'push'],
  'wifi-off': ['disabled', 'no internet', 'disconnected', 'offline'],
  'trending-up': ['statistics', 'increase', 'growth', 'profit', 'stock', 'bullish'],
  'trending-down': ['statistics', 'decrease', 'loss', 'decline', 'stock', 'bearish'],
  'subscript': ['text', 'typography', 'formatting', 'math', 'chemistry'],
  'squircle': ['shape', 'rounded square', 'geometry'],
  'pentagon': ['shape', 'polygon', 'geometry', 'five sided'],
  'text-cursor-input': ['select', 'type', 'caret', 'cursor', 'text entry', 'field'],
  'lightbulb-off': ['lights', 'dark', 'idea off', 'power off'],
  'list': ['options', 'menu', 'bullet points', 'catalog', 'catalogue'],
  'list-filter': ['options', 'filter', 'refine', 'sort'],
  'lock-keyhole-open': ['security', 'unlock', 'open', 'access'],
  'monitor-off': ['share', 'display off', 'screen off', 'disabled'],
};
