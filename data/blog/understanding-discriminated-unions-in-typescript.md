---
title: Understanding Discriminated Unions in Typescript
date: 2019-09-06 14:30:36
author: Muhammad Ahsan Ayaz
images: ['/static/images/understanding-discriminated-unions-in-typescript/discriminated_unions.jpg']
description: This article explains what are Discriminated Unions in Typescript and how we can use them.
tags:
  - typescript
  - web development
---

As you may already know, Typescript is a superset of Javascript; and is simply awesome. There are numerous features we love and hear about Typescript every day. For example, we could have a look at interfaces, enums, unions, intersections, type guards and much more.

In this article, we're going to focus on _Discriminated Unions_ in TypeScript. We'll look into what they are and by the end of the article, you'll have a good understanding of where you can use these.

## Discriminated Unions

Discriminated Unions, also called _algebraic data_ types or _tagged unions_ are a combination of three things:

- The discriminant
- The union
- Type guards

Let's understand each of the above, one by one with examples.

## The Discriminant

The discriminant is a _singleton_ type property which is common in each of the elements of the union. You can read more about Typescript Singleton Types in this [article](https://medium.com/@tar.viturawong/using-typescripts-singleton-types-in-practice-f8b20b1ec3a6).

See the example below:

```typescript
enum CarTransmission {
  Automatic = 200,
  Manual = 300,
}

interface IMotorcycle {
  vType: 'motorcycle' // discriminant
  make: number // year
}

interface ICar {
  vType: 'car' // discriminant
  transmission: CarTransmission
}

interface ITruck {
  vType: 'truck' // discriminant
  capacity: number // in tons
}
```

You can see that the `vType` property in the interfaces is the `discriminant` or the tag. The other properties are specific to the corresponding interfaces.

## The Union

The union of the interfaces can be simply created as follows:

```typescript
type Vehicle = IMotorcycle | ICar | ITruck
```

We can now use this union (type) in our code where we can have more than one kind of vehicles expected in a variable.

## The Type Guards

Consider the following example based on the interfaces we defined above:

```typescript
const evaluationFactor = Math.PI // some global factor

function evaluatePrice(vehicle: Vehicle) {
  return vehicle.capacity * evaluationFactor
}

const myTruck: ITruck = { vType: 'truck', capacity: 9.5 }
evaluatePrice(myTruck)
```

The above code will cause the typescript compiler to throw the following error:

```bash
Property 'capacity' does not exist on type 'Vehicle'.
  Property 'capacity' does not exist on type 'IMotorcycle'.
```

The reason is that the property `capacity` does not exist on the interface `IMotorCycle`. Well, actually it doesn't exist in `ICar` too but it already breaks checking `IMotorCycle`, which is declared before `ICar`, so it doesn't reach checking `ICar`.

Well, how do we fix this? Using _type guards_ of course. See an example below:

```typescript
function evaluatePrice(vehicle: Vehicle) {
  switch (vehicle.vType) {
    case 'car':
      return vehicle.transmission * evaluationFactor
    case 'truck':
      return vehicle.capacity * evaluationFactor
    case 'motorcycle':
      return vehicle.make * evaluationFactor
  }
}
```

Using the `switch` & `case` operators fix the problem for us by serving as _type guards_, making sure we're accessing the right properties of the `vehicle` that we've got in the `evaluatePrice` method.

If you're using an editor like [VSCode](https://code.visualstudio.com/), you'll notice that before using these _type guards_, the IntelliSense may only have shown you `vType` as a property when you typed `'vehicle.'`. But if you type `'vehicle.'` inside any of the case statements now, you'll see that now, the appropriate properties by the IntelliSense are shown from the appropriate interfaces.

## Checking Exhaustiveness

What if we wanted to introduce a new type/interface to the union `Vehicle`? You might think that the `evaluatePrice` function doesn't have the case handled for that. And that's accurate. But we need the compiler to let us know at build time (or using `tslint` etc) that we need to cover all variants of the type zVehiclez. This is called _Exhaustiveness Checking_. One of the ways to ensure we're covering all variants of a union is to use `never`, which the typescript compiler uses for exhaustiveness.

Assume we added a new type `IBicycle` to the `Vehicle` union as below:

```typescript
interface IBicycle {
  vType: 'bicycle'
  make: number
}

type Vehicle = IMotorcycle | ICar | ITruck | IBicycle
```

We'll be able to use `never` for the exhaustiveness check as follows:

```typescript {9-11}
function evaluatePrice(vehicle: Vehicle) {
  switch(vehicle.vType) {
    case "car":
      return vehicle.transmission * evaluationFactor;
    case "truck":
      return vehicle.capacity * evaluationFactor;
    case "motorcycle":
      return vehicle.make * evaluationFactor;
    default:
      const invalidVehicle: never = vehicle;
      return throw new Error(`Unknown vehicle: ${invalidVehicle}`);
  }
}
```

The above should show an error in the editor (using lint tools) or on compile time as below:

```bash
Type 'IBicycle' is not assignable to type 'never'.
```

The above shows we need to handle `IBicycle` as well. Once we add the `case` for `IBicycle` in the `evaluatePrice` method as below, the error should go away.

```typescript {9,10}
function evaluatePrice(vehicle: Vehicle) {
  switch(vehicle.vType) {
    case "car":
      return vehicle.transmission * evaluationFactor;
    case "truck":
      return vehicle.capacity * evaluationFactor;
    case "motorcycle":
      return vehicle.make * evaluationFactor;
    case "bicycle":
      return vehicle.make * evaluationFactor;
    default:
      const invalidVehicle: never = vehicle;
      return throw new Error(`Unknown vehicle: ${invalidVehicle}`);
  }
}
```

You can find a working example here on [Stackblitz](https://stackblitz.com/edit/discriminated-unions-typescript).

## Conclusion

Discriminated unions are pretty powerful combined with Typescript's ability to differentiate the types based on the discriminants/tags. When used right, this can bring significant readability to the code and is great when it comes to writing reliable dynamic types with functions.

### Further Reading

[Exhaustive Type Checking with TypeScript!](https://dev.to/babak/exhaustive-type-checking-with-typescript-4l3f)
[Advanced Types - Typescript](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
[CodingBlast Typescript series](https://codingblast.com/series/typescript/)

If you learned something new from this article, don't forget to show this to your friends and workmates. Happy coding!
