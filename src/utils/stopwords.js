/**
 * Comprehensive set of English stopwords
 * These are common words that typically don't contribute to the semantic meaning of text
 */

const stopwordsList = [
  // Articles
  'a', 'an', 'the',
  
  // Pronouns
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  'this', 'that', 'these', 'those',
  'who', 'whom', 'whose', 'which', 'what',
  
  // Prepositions
  'about', 'above', 'across', 'after', 'against', 'along', 'amid', 'among',
  'around', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'besides',
  'between', 'beyond', 'by', 'concerning', 'despite', 'down', 'during',
  'except', 'for', 'from', 'in', 'inside', 'into', 'like', 'near', 'of',
  'off', 'on', 'onto', 'out', 'outside', 'over', 'past', 'regarding',
  'round', 'since', 'through', 'throughout', 'to', 'toward', 'towards',
  'under', 'underneath', 'until', 'unto', 'up', 'upon', 'with', 'within', 'without',
  
  // Conjunctions
  'and', 'but', 'or', 'nor', 'so', 'yet', 'for', 'as', 'if', 'then', 'than',
  'because', 'while', 'where', 'when', 'whenever', 'wherever', 'whether',
  
  // Auxiliary verbs
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'would', 'should', 'could', 'might', 'may', 'must', 'shall', 'will', 'can',
  
  // Adverbs
  'very', 'really', 'quite', 'rather', 'somewhat', 'more', 'most', 'much',
  'many', 'some', 'any', 'enough', 'all', 'both', 'each', 'every', 'few',
  'little', 'less', 'least', 'other', 'another', 'such', 'no', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'just', 'now', 'here', 'there', 'always',
  'never', 'sometimes', 'often', 'seldom', 'again', 'ever', 'still', 'already',
  'even', 'once', 'twice', 'thrice',
  
  // Numbers
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  
  // Common filler words
  'um', 'uh', 'er', 'ah', 'like', 'okay', 'ok', 'yeah', 'well', 'actually', 'basically',
  'literally', 'totally', 'sort', 'kind', 'of', 'type', 'thing', 'stuff', 'etc',
  
  // Time-related words
  'today', 'yesterday', 'tomorrow', 'day', 'week', 'month', 'year',
  'morning', 'afternoon', 'evening', 'night', 'time', 'date',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  
  // Question-related words
  'what', 'when', 'where', 'why', 'how', 'who', 'whom', 'whose', 'which',
  'did', 'do', 'does', 'done', 'doing',
  
  // Domain-specific words (for financial/money-related questions)
  'money', 'financial', 'finance', 'dollar', 'dollars', 'cent', 'cents',
  'spend', 'spent', 'spending', 'buy', 'bought', 'buying', 'purchase', 'purchased', 'purchasing',
  'pay', 'paid', 'paying', 'payment', 'payments', 'cost', 'costs', 'costing',
  'price', 'prices', 'pricing', 'expense', 'expenses', 'expensive',
  'cheap', 'cheapest', 'affordable', 'budget', 'budgeting', 'save', 'saved', 'saving', 'savings'
];

// Convert to a Set for O(1) lookups
const stopwords = new Set(stopwordsList);

export default stopwords;
