import { AppSchema } from '../schema.service'

// idea: have schema as ts file, ts gives type validation

/*

  - name: menu
    fields:
      - name: id
      - name: obj
        type: menu2
      - name: items
        type: array
        arrayOf: string
      - name: label
      - name: component
      - name: segment
      - name: page
        type: link
      - name: pub
        type: boolean
      - name: order
        type: number

  - name: page
    folders: true
    fields:
      - name: id
      - name: lang
        label: Language
        descr: Page language
        required: true
        minLength: 2
        maxLength: 2
      - name: metaTitle
        maxLength: 40
      - name: metaDescription
        maxLength: 140
      - name: date1
        type: date
      - name: pub
        label: Published
        descr: If article is published
        type: boolean
      - name: content
        type: markdown
      - name: num1
        type: number
 */

export const schema: AppSchema = {
  types: [
    {
      name: 'language',
      fields: [
        {
          name: 'id',
          minLength: 2,
          maxLength: 2,
        },
        {
          name: 'label',
          required: true,
        },
      ],
    },
  ],

  collections: [],
}
