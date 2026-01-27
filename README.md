# Ropac

RBAC Permission Framework

## Overview

Ropac is a server / client framework for defining permission based access to data being delivered to the client.  This is designed for use primarily in applications built using `React`, but may be usable in other frameworks as well.  Feel free to contribute if desired.

### Limitations

1. `Ropac` is focused solely on facilitating the delivery of data structures securely from a server to a client. As such, it does not provide anything in regards to actually structuring your RBAC system.  

2. Additionally, outside of providing some built in hooks like `usePermissions`, we don't attempt to handle client rendering.  It will be up to the developer to transform the data into their rendered component.

3. When the value of a property is an array of objects, permissions are applied to the array as a whole, not the individual items inside of the array. Items themselves inherit the permissions of the parent array.

- For instance - if you have an array of type `string[]`
    - "Create": Can create a new array / collection of items.
    - "Read": Can view the elements of the array
    - "Update": Can change the elements of the array (Remove / Delete).
    - "Delete": Can delete the entire array (setting the value to `null`).

### Problems Addressed

The typical workflow for defining any CRUD based system is usually as follows - 

1. Define your package being delivered by the server to the client. In React applications, this is usually in the form of some component like follows.  

2. The client will typically need data sourced from a secure / remote location (like a database) to hydrate the ui.  This is commonly done in a fetch request from the component.

3. The api, upon receiving the aforementioned fetch request, will fetch and return the data.

This is pretty straightforward, but quickly becomes more complicated when you need to limit the data returned to the client based on the client's permissions.

#### Who's responsible for what?

As an example, let's take a `UserProfile` component.

Maybe an Admin 
- See all information for the user.
- Can update all the fields

While a regular "User" role
- Can see their name, phone, email and address. (Cannot see their userId)
- Can only update their email.

The most immediate answer (and the one commonly implemented by LLM's / coding agents) is to handle permissions on a case by case basis directly inside of the client. This is normally done by checking the user's role, and rendering a different component based on that role.

There are a few issues with this approach.

1. This is inherently insecure.  The client will receive the userId field value -> even though they can't see it through the ui, they can access this in the browser console.

2. This does not scale, as the approach is a "combinatorial" in nature.

For instance, if you add in department assignments, you might need to verify what department the user belongs to, adding another "case" you need to handle. What if there is an IT department that can access everything as long as the user is an Admin?

To address the first issue, you can simply move permission checks to the api.  This is where it should be done in the first place, but you would be surprised how often this logic gets handled client-side. To prevent sending protected data to the client, you can simply make each field of the client component possibly undefined. This approach has it's limitations, but is more secure.

However, you are still confronted with the problem of permission mapping -> It's just moved to the api now. It's not unreasonable to expect this kind of code to arise.

This is difficult to read and reason about.

#### A Data Driven Approach

`Ropac` borrows from the "MVC" (Model View Controller) framework.

- `Model`: The structure of the data needed to hydrate the client ui.
- `View`: (client) A structure outlining the value of each `Model` field and it's CRUD permissions.
- `Controller`: (server) Implemented on the api to control the data delivered to the client.

A instance of the `Model` class is defined by the developer. This outlines the structure of the data, and defines the methods needed to retrieve the data and properly assign permissions.  You provide the data 'structure' through a generic argument.

The `Model` instance contains methods to create instances of both the `View` and `Controller`.  Since they both are created from the same parent, they are able to communicate intelligently and easily. 

The `View` has methods to request data from the `Controller`. 

The `Controller` handles these incoming requests asynchronously, and returns a `ViewData` object.

The `View` then receives this `ViewData` object, which has all keys of the generic argument provided to the model. Each key in the `ViewData` object has a `ViewDataField` object that has the following properties:

```typescript
{
    value: any | null // The value of the field fetched from the database
    permissions: "CRUD" // The access permissions the client has to the field.  Each letter corresponds to a CRUD operation
}
```

Additionally, a `View` object contains an array of `Action` strings that will hold all available actions the client is allowed to take.

The `value` can be anything, but we explicitly add `null` for clarity -

- If the user does not have "Read" permission, the `value` will always equal `null`.  If the user **does** have "Read" permission and the `value` is null, you can assert that the actual value from storage is `null`.  Therefore, for a "should I render this field?" type of determination, it is safer to use the `View.canRead(<property path(property.path)>)` method on the view object.

For react projects, the `View` class can be provided as an argument to the `usePermissions` hook, which will automatically request data, provides loading states, and facilitate data updates through patch requests to the api. 

### Key Structures

- `Model`: Used to map any generic typescript object to a set of values, permissions and actions. Defines the base `Permission<T>` objects, and creates instances of `Controller` and `View`.
- `Controller`: Created by a `Model` to facililate data retreival and permission handling
- `View`: Created by a `Model` instance and delivered to the client on initial hydration.  Contains methods to retreive and populate data.
- `Permission`: Defines a set of access permissions for a particular role for all fields of `T`.
- `Action`: Any generic action that can be delivered / assigned to the model.  Generally, this is for operations that encompass several fields, or operations that may dramatically change the state of the `Model`. An example may be `APPROVE_PERMIT`.

#### Generic Arguments

The generics are assumed to be the following: 

- `T`: The interface needed to hydrate your client component
- `A`: The interface needed for the controller to process the request. 
- `R`: The structure of your `Roles`
- `X`: The structure of your `Actions`.

## Permission Paradigms

### Roles

Roles are a central component of an RBAC system. However, they often differ in complexity and implementation from project to project.

In `Ropac`, we don't necessarily care about _what_ the role is or how it is structured -> we just need to know what it is, and how it's permissions should be applied to `Model` data. 

The `Role` generic can be anything you want, as long as it's the same type for a model. This allows you to define as many different kinds of role combinations as you want. In the future, we could probably add in a general interface to interact with, but for now you're limited to a single `Role` "type".

```typescript
    enum AppRole {
            ADMIN,
            PROJECT_MANAGER,
            SUPERVISOR,
            USER 
        }

    enum Department {
            MARKETING,
            SALES,
            IT,
            HUMAN_RESOURCES 
        } 

    interface DepartmentRole {
        department: Department
        role: AppRole;
    }

    const salesPM = new Role<DepartmentRole>({ department: Department.SALES, role: AppRole.PROJECT_MANAGER });
```

You can kind of consider a `Role` to just be a conceptual idea that can have permissions ascribed to it.

A `Role` will have allowed `Permissions` (on a per-field basis) and `Actions` (on a per-model basis).  
- Permissions: What kind of access (CRUD) the role has to a particular field. Can it
    - Create: create a new instance of the field? (null -> value)
    - Read: view that data in the client? (value)
    - Update: change the value of the field to a new value? (value -> newValue)
    - Delete: remove that field entirely? (value -> null)


A large part of `Ropac`'s toolkit is providing tools to easily design and reason about access on a per-role basis.

You'll find that in most cases, you only really care about the 'read' and 'update' permissions - 'create' and 'delete' often fall more under the domain of an 'Action'.

### Access

In RBAC systems, there are two approaches to defining access - 
- **Restrictive**: All access is disabled unless explicitly enabled. (denylist, whitelist)
- **Permissive**: All access is allowed unless explicitly disabled. (allowlist, blacklist)

When designing your application's access strategy, we generally recommend the following -
- Permissions (access to data): In a large majority of cases, you will find that permissions are generally the same for most data. For this purpose, **we generally suggest that permissions should be _permissive_**.
This means providing a set of access defaults, then removing / adding them on a case by case basis. An example would be an admin being able to have all "CRUD" actions enabled by default, while a regular user might only need read access.

- Actions: Actions are general purpose, and usually imply state modifications or mutating a different object. For example, "APPROVE_PERMIT" will likely affect several structures and affect modify external state.  **We generally suggest that actions should be _restrictive_**. This is because actions should typically be granted on a case-by-case basis. Using the "APPROVE_PERMIT" example from before, you likely only want to grant this action when the permit has been reviewed.

## Usage

For this example, we will be defining a component that renders a user profile card

```
// Define the interface for the component
    interface UserProfile {
      userId: string;
      firstName: string;
      lastName: string;
      phone: string;
      age: number;
      address: Address;
      documents: Document[]
    }
    
    interface Address {
      street: string;
      city: string;
      state: string;
    }
    
    // You will also need to define an interface for the arguments that will be used by the controller to fetch / handle the data
    interface UserProfileA {
      userId: string;
    }
```

### Defining the Model

#### ModelProps

The first thing one should generally do is define your `Model` object that will instantiate the `Model` object.

When defining a `ModelProps` object, there are several methods and properties you will need to implement that will be called / used by the `Model`.

These are -
- `getPermissions(data: T, args?: A): Promise<RolePermissions[]> | RolePermissions[]`: Should return an array of `RolePermissions<R>` objects. These are the default permissions that will be given to a `Role` for every field of the model generic (`T`).  You can read more about setting these in an idiomatic way in [Best Practices](##Best Practices)
- `getData(args: A): Promise<ModelValues<T>> | ModelValues<T>`: The function responsible for fetching the data for the model's generic argument type.
```typescript
    interface User {
        name: {
            first: string;
            last: string;
        },
        age: number;
        email: string;
    }

    interface UserModelA {
        userId: string; }

    const userModelProps: ModelProps<User, UserModelA> = {
       getData: (args: UserModelA) => {
            const result = await db.users.select().where({ id: args.userId }); 
            return result
       } 
    }
```
This should return a `ModelValues<T>` object, which is just a type that requires all keys of the provided generic have values (even if the value is `null`!).

#### Overridable Methods

In addition to the above methods, you can provide overrides for the following methods. These methods have default implementations in the `Model` class already, so these are not required.

- `getActions(args?: A)`
- `updatePermissions(data: ModelValues, defaultPermissions: ModelPermissions): Promise<ModelPermissions | ModelPermissionMap`: Runs after `getData` and is supplied with the values retrieved by that function.  This is used to update the permissions depending on the data returned from the `getData` call.  Commonly, this is checking the status of the data, and if it's in a particular state, adding / removing permissions.
**Default: Returns the permission structure from the `getPermissions` method.**

TODO: NEED TO UPDATE THIS WITH HOW WE ARE GOING TO MANAGE ROLE PERMISSIONS AND MAPPING.
```typescript
    interface ApprovalStatus {
        status: "Approved" | "Denied" | "Pending"
    }
    
    interface ApprovalStatusModelA {
        id: string;
    }

    const approvalStatusModel = ModelProps<ApprovalStatus, ApprovalStatusModelA> = {
        getData: (args?: ApprovalStatusModelA) => {
            return await db.approvalStatus.select().where({ id });
        };

        updatePermissions: (data: Values<ApprovalStatus>, rolePermissions: RolePermissions[], args?: A) => {
            switch (data.status) {
                case "Approved":
                   rolePermissions 
            }
        }
    }
```
This should return an instance of `ModelPermissions<T, R>`, which is a type that requires all keys of the provided generic have a `Record<R, Permissions>.` This is an object that maps all available roles for this model with their permissions.


TODO: NEED TO ENSURE updateActions IS VALID AFTER IMPLEMENTATION
- `updateActions(data: ModelValues:<T>, permissions: ModelPermissions<T, R>, args?: A): Promise<ModelActions>`: This function should return a `ModelActions` object, which is a container for the available actions that can be taken against the container.
**Default: Returns an empty `ActionSet`

### Instantiating the Model

To define a `Model`, create a object that implements the `ModelProps` interface and provide it as an argument to the constructor.
```typescript
    const props: ModelProps<UserProfile, UserProfileA> = {}
    <placeholder text block ModelProps definition>
    const userProfileModel = new Model(props);
    export { userProfileModel };
```

This should be done in a server environment.

### The Controller (api)

Next, in the api route handler previously defined in the `ModelProps` object

```typescript
    import { userProfileModel } from '@models/user-profile'
    const controller = userProfileModel.createController();
```

Ensure you have `GET` and `PATCH` request handlers defined.  If you defined them at different endpoints, you will probably need to create a new instance of the controller in each file.

In the `GET` handler, call the `handleRequest()` method, providing the argument object of type `A`.

```typescript
   // Get Handler
   // GET handlers can't accept a body, so you should pass the data in as a query parameter, then structure the data to match the type A you provided in your Model definition.
   const response = controller.handleRequest({ ...args });
   // Return the response
```

In the `PATCH` handler, call the ` handlePatch()` method, passing the body of the request as the argument

```typescript
    // PATCH Handler
    const response = controller.handleUpdate(req.body)
    // return the response
```

### The View (client)

**Important: The `View` object should be delivered as a property of the client component.  The client component should not call `Model.createView()`, as this would deliver the entire object to the client.**

The `View` is provided as an argument to the `usePermissions` hook.

```
// We'll pass in a `View` object, which facilitates interaction with the api. 
interface UserProfileCardProps<UserProfile> {
  view: View<UserProfile, UserProfileA>
}

export function UserProfileCardNew(props: UserProfileCardProps) {
  // data is the values for UserProfile
  // derived evaluates the state of data and returns rendering rules like `canEdit`
  // update is the equivalent of setData, but we call it for individual fields.
  // isLoading is a state variable -> true when making request to api, false when response returned.

  const { data: userProfile, derived, update, isLoading }= usePermissions(props);

  const { canEdit } = derived;

  function updateFirstName(newFirstName: string) {
    // update can handle multiple fields, we just provide them in a tuple
    update([userProfile.firstName, newFirstName])
  }
  return (
    <div> 
      { isLoading && renderSkeleton() }   
      {canEdit && <button>Edit</button>}
      <div>{userProfile.firstName}</div>
      <div>{userProfile.lastName}</div>
    </div>
  )
}
```
 
The `usePermissions` hook will take care of fetching and repopulating the data.

If you wanted to do this manually, you can just call

```typescript
    // get the data from the api
    const data = view.request(props);

    // update the data, and receive a new view model back
    // this would occur after a value of the model had been updated. 
    // when calling the `update` method on the `View` object, it does not automatically update state -> this only happens when calling it on the hook.
    const updatedData = view.update(newData)
```

## Best Practices

### Narrowing Model for your Application

It's likely that your type arguments for `Role` and `Action` are going the be the same. You can re-export the `Model` and `ModelProps` types to avoid including these in every `Model` definition.

```typescript
    import { Model as BaseModel, ModelProps as BaseModelProps } from "ropac";

   interface MyRole {
        name: string;
        department: string;
   } 

   interface MyAction {
        name: string;
        callback: () => Promise<void>;
   }

   export ModelProps<T, A> extends Model<T, A, MyRole, MyAction> {}
   export Model<T, A> extends Model<T, A, MyRole, MyAction> {}
```

## Design Concerns

- Clarify how View methods survive serialization when delivered to the client, or document the client-side reconstruction pattern.
- Define how permissions are combined when a user has multiple roles (union vs intersection).
- Document how the View discovers Controller endpoints.
- Clarify whether nested properties can have independent permissions (e.g., `address.street` vs `address.city`).
- Explicitly state that the Controller re-validates permissions on PATCH requests.
- Define error handling patterns when requests fail or permissions are denied.
- Document whether the `update()` hook method is optimistic or waits for server confirmation.
- Clarify whether fields without read permission are omitted from the response or returned as null.
- Ensure correct syntax in code block examples throughout documentation.
