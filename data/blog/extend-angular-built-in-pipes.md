---
title: How to extend Angular built-in pipes and why
date: 2019-09-18 21:35:00
author: Muhammad Ahsan Ayaz
images: ['/static/images/extend-angular-built-in-pipes/thumbnail.png']
description: In this article, we're going to talk about extending Angular built-in pipes. We'll see why we would do that, and how that makes is so easy to implement our own custom requirements.
tags:
  - angular
  - typescript
  - web development
---

Angular provides a lot of built-in pipes that are usually sufficient for our daily angular jobs. However, some times we find ourselves cornered and that may require us to write our own solutions. In such cases, we may start writing something from scratch. But why re-invent the wheel and not build on top of what Angular provides us already? In this article, we're going to extend an Angular pipe to fulfill our own needs.

We're going to extend the `titleCase` pipe that Angular provides and can be found under `@angular/common` package. See [docs](https://angular.io/api/common/TitleCasePipe#usage-notes).

First, we have to create a pipe named `titleCaseExtended`, you can simply do that using:

```bash
ng generate pipe path-to-folder/title-case-extended
```

The above should create the file for you under the folder `path-to-folder`, named `title-case-extended.pipe.ts`. Let's see the contents of the file below:

```typescript
import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'titleCaseExtended',
})
export class TitleCaseExtendedPipe implements PipeTransform {
  transform(value: any, ...args: any[]): any {
    return null
  }
}
```

## Extending Angular's TitleCasePipe

We'll extend our pipe using Angular's built-in `titleCase` pipe as follows:

```typescript {2,7-10}
import { Pipe, PipeTransform } from '@angular/core'
import { TitleCasePipe } from '@angular/common'

@Pipe({
  name: 'titleCaseExtended',
})
export class TitleCaseExtendedPipe extends TitleCasePipe implements PipeTransform {
  constructor() {
    super()
  }
  transform(value: any, ...args: any[]): any {
    return null
  }
}
```

## Writing custom functionality

Now that we have extended the pipe, we can write our own logic. Angular's `titleCase` pipe only accepts a _string_ value which it can convert to the _title case_. Imagine that we have to pass an array of objects (`[{}]`) to a component that we don't own, as an input. I.e. we don't have the access to its template. We can't apply Angular's `titleCase` to a property of the items in that array if that's what we want to transform. For that exact reason, we're creating the `titleCaseExtended` pipe.

First, we'll make sure that our pipe also serves the purpose of `titleCase`. I.e. it works on a simple string as well:

```typescript {12-15}
import { Pipe, PipeTransform } from '@angular/core'
import { TitleCasePipe } from '@angular/common'

@Pipe({
  name: 'titleCaseExtended',
})
export class TitleCaseExtendedPipe extends TitleCasePipe implements PipeTransform {
  constructor() {
    super()
  }
  transform(value: any, ...args: any[]): any {
    if (typeof value === 'string') {
      // if the value we have to transform is a simple string
      return super.transform(value)
    }
    return null
  }
}
```

See the usage below for the use case where the pipe is being applied to a string:

```html
<!-- user.name is a string value -->
<div>{{user.name | titleCaseExtended}}</div>
```

Now, we'll handle the case when we're dealing with an array. For that, we'll simply loop over the array and transform its elements:

```typescript {15-21}
import { Pipe, PipeTransform } from '@angular/core'
import { TitleCasePipe } from '@angular/common'

@Pipe({
  name: 'titleCaseExtended',
})
export class TitleCaseExtendedPipe extends TitleCasePipe implements PipeTransform {
  constructor() {
    super()
  }
  transform(value: any, ...args: any[]): any {
    if (typeof value === 'string') {
      // if the value we have to transform is a simple string
      return super.transform(value)
    } else if (Array.isArray(value)) {
      // if the value we have to transform is an array
      return value.map((item) => {
        // transform item here..
        return item
      })
    }
    return null
  }
}
```

Now we may see two possibilities:

- Each `item` in the array is a simple string. I.e. we have to transform `string[]`.
- Each `item` in the array is an object and we have a `property` that we can work with. I.e. we have to transform `item[property]`.

Let's handle these cases below.

### Transforming an Array of string values

To work with an array of strings, we'll simply transform each element of the array using Angular's `titleCase` pipe.

```typescript {18-21}
import { Pipe, PipeTransform } from '@angular/core'
import { TitleCasePipe } from '@angular/common'

@Pipe({
  name: 'titleCaseExtended',
})
export class TitleCaseExtendedPipe extends TitleCasePipe implements PipeTransform {
  constructor() {
    super()
  }
  transform(value: any, ...args: any[]): any {
    if (typeof value === 'string') {
      // if the value we have to transform is a simple string
      return super.transform(value)
    } else if (Array.isArray(value)) {
      // if the value we have to transform is an array
      return value.map((item) => {
        // if the current item in the array is a simple string, we transform it
        if (typeof item === 'string') {
          return super.transform(item)
        }
        return item
      })
    }
    return null
  }
}
```

See below an example usage of the pipe for an Array of strings:

```typescript
@Component({})
class MyComponent {
  subjects = ['Computer Science', 'Maths', 'Biology']
}
```

```html
<!-- each item in `subjects` is a string value -->
<div class="subjects">
  <div class="subjects__subject" *ngFor="let subject of subjects | titleCaseExtended">
    <!-- we don't have to modify the `name` property here now -->
    {{user.name}}
  </div>
</div>
```

### Transforming an Array of objects

To work with an Array of objects, we have to know which property inside the objects is to be transformed. For instance, if we have a `users` array which has a property `full_name` that needs to be transformed, we need to somehow pass this property `full_name` in our pipe.

So first, let's add the code to read the argument for the desired property:

```typescript {12-13}
import { Pipe, PipeTransform } from '@angular/core'
import { TitleCasePipe } from '@angular/common'

@Pipe({
  name: 'titleCaseExtended',
})
export class TitleCaseExtendedPipe extends TitleCasePipe implements PipeTransform {
  constructor() {
    super()
  }
  transform(value: any, ...args: any[]): any {
    const property = args[0]
    const isValidProperty = property && typeof property === 'string'
    if (typeof value === 'string') {
      // if the value we have to transform is a simple string
      return super.transform(value)
    } else if (Array.isArray(value)) {
      // if the value we have to transform is an array
      return value.map((item) => {
        // if the current item in the array is a simple string, we transform it
        if (typeof item === 'string') {
          return super.transform(item)
        }
        return item
      })
    }
    return null
  }
}
```

In the above snippet, we're reading the first argument of the `transform` function using `args[0]` and assigning it to the variable `property`. Then we're validating the `property` to see if the type of the property is `string` so we can transform it.

The next step is to use the `property` and transform it in each `item`. See the code snippet below:

```typescript {23-26}
import { Pipe, PipeTransform } from '@angular/core'
import { TitleCasePipe } from '@angular/common'

@Pipe({
  name: 'titleCaseExtended',
})
export class TitleCaseExtendedPipe extends TitleCasePipe implements PipeTransform {
  constructor() {
    super()
  }
  transform(value: any, ...args: any[]): any {
    const property = args[0]
    const isValidProperty = property && typeof property === 'string'
    if (typeof value === 'string') {
      // if the value we have to transform is a simple string
      return super.transform(value)
    } else if (Array.isArray(value)) {
      // if the value we have to transform is an array
      return value.map((item) => {
        // if the current item in the array is a simple string, we transform it
        if (typeof item === 'string') {
          return super.transform(item)
        } else if (isValidProperty && item[property]) {
          // if the item in the array is an object and we have the property in the object, we transform item
          item[property] = super.transform(item[property])
        }
        return item
      })
    }
    return null
  }
}
```

See below a sample usage of the pipe for an Array of objects, with [ngx-bootstrap typeahead](https://ng-bootstrap.github.io/#/components/typeahead):

```typescript
@Component({})
class MyComponent {
  users = [
    {
      full_name: 'Ahsan Ayaz',
    },
    {
      full_name: 'Mohsin Ayaz',
    },
    {
      full_name: 'Saad Qamar',
    },
    {
      full_name: 'Mehdi Rajani',
    },
  ]
}
```

```html
<!-- each item in `subjects` is a string value -->
<form class="form">
  <input
    class="owner"
    id="ownerInput"
    [typeahead]="users | titleCaseExtended : 'full_name'"
    type="text"
    typeaheadWaitMs="300"
    typeaheadOptionField="full_name"
  />
</form>
```

Notice that we're using `| titleCaseExtended : 'full_name'`. This `full_name` is a string which is passed to the `transform` method by Angular, and then we get it in our pipe using `args[0]`. NgxBootstrap's typeahead with an array of objects is a really good use case where our pipe can shine. Because we can't transform a property inside the items when passing it to the typeahead as input.

Welp! Our extended pipe is now ready to be used. You can get the pipe's code and example usage from this [Gist](https://gist.github.com/AhsanAyaz/29325c3ecfec5949e7de2d56ac1c7678) as well.

## Conclusion

Angular provides a lot of things out of the box and we can build our own stuff on top of those things. This was just one example. I'd really love to know what you build after reading this article. You might extend any services or pipes to create your own :)

If you learnt something new in this article, do share it in your circle. Also, when you [subscribe to my Youtube channel](https://www.youtube.com/channel/UCAys-Lg76QcRNGc0dOr_bXA?sub_confirmation=1), you'll see even more of the amazing content I'm sharing these days.
