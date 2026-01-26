import { ActionSet } from "./lib/actions.js";
import { Model, ModelData } from "./lib/models.js";


interface AppAction {
  id?: string;
  name: string;
}

interface AppRole {
  id?: string;
  title: string;
}

interface User {
  name: {
    first: string;
    last: string;
  }
  phone: string;
  age: string;
}

interface UserModelArgs {
  userId: string;
}


const userModelData: ModelData<User, AppAction> = {
  data: {
    name: {
      first: {
        value: "Blingus",
        permissions: ["create"]
      },
      last: {
        value: "Lingus",
        permissions: ["create"]
      }
    },
    phone: {
      value: undefined,
      permissions: []
    },
    age: {
      value: undefined,
      permissions: []
    },
  },
  actions: new ActionSet<AppAction>({ name: "CAN_DELETE" })
}

const userModel: Model<User, UserModelArgs, AppAction, AppRole> = {
  endpoints: {
    url: "api/user/",
    get: {},
    patch: {},
  },
}


// Server 

// const controller = new ModelInstance(modelDefinition: Model).createController();
// 
// const result = await controller.handleRequest(body.json());
// 
// return NextResponse(result);


// Client
//
// before delivery of client components
// 
// const view = new ModelInstance(modelDefinition: Model).createView();
// return <UserProfileCard view={view} />
//
//
// On the client -
//
// const { data, actions, update, isLoading } = usePermissions(view);
//
// {data.name.first && (
//    <FirstNameDisplay name={data.name.first} />
// )}
