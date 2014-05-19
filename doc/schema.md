
# Schema

## Types

Currently, 6 types are supported :

 * string
 * integer
 * float
 * boolean
 * date
 * i18n string

### float

The type float takes an optional parameter: `precision`. It is used under the hood as a parameter
of `.toPrecision()` method. By default, `precision` is 3 (two digits).

Example:

    floatField: {
        type: 'float'
        precision: 4
    }
