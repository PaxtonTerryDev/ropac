- [ ] Probably need to make `Args` generic parameter required to extend object.
- [ ] Data probably needs to extend from object
- [ ] Endpoints are requesting we provide them with params / args -> I think we are providing those directly into the handler methods.
- [X] Bug in `applyPermissions` -> Not applying changes. 

NOTE: I'm not really sure about this one.
- [ ] Update names in `models` to reflect new paradigm
    - get methods should return `Model<Roles | Permissions | Actions>`, which is the full set of those particular fields that can be accessed by the model.
    - use methods should return `Response<Roles | Permissions | Actions>` which is the full set of those particular fields that will be delivered to the client.

- [ ] should implement some kind of test around what happens when server rejects the update. 
    - should it reject all updates, or apply those that it has access to? 
- [ ] We are going to be using the `FieldAccessor` functionality in both the client access, along with when we are defining conditionals in derive.  We should see if there is a way we can share this data so we don't need to recalculate -> although, it's probably fine, as it's sharing from the same data model, and we need to do some work on the client anyways.

