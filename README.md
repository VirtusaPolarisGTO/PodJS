# pod.js
# [P]lugin [O]riented [D]evelopment for AngularJS 1.5x

Pod is a framework for AngularJS 1.5x which allows you to create dynamic UI plugins in the form of AngularJS components

**Features**
  - UI framework developers can **create plugin slots**
  - UI plugin providers can **create plugins** that fit into predefined slot types
  - Inter-plugin **communication**
    - Data
    - Events
    - Subjects
    - Shared UI-Router States

**Dependencies**
 - `AngularJS 1.5x`
 - `AngularJS UI-Router`
 - `RxJS` *(Reactive Extensions Library for JavaScript)*
    Pod uses Behaviour Subjects provided by RxJS for inter-plugin communication

**Getting Started**

Import the required libraries and you're all set!
```html
<script type="text/javascript" src="scripts/rx.js"></script>
<script type="text/javascript" src="scripts/pod.js"></script>
```

# Creating Plugin Slots
```html
<pod pod-type="'widgetSlot'">
    <div class="widget-wrapper" ng-click="selectWidget(pod.widgetName)" >
        <pod-target/>
    </div>
</pod>
```

# Creating Plugins
```js
.component('dateWidget', {
    template: 'The date is <strong>{{$ctrl.date}}</strong>',
    controller: function() {
        this.date = new Date();
    },
    podType: 'widgetSlot',
    podArgs: {
        widgetName: 'dateWidget'
    }
})
```

# Inter-Plugin Communication

To communicate between plugins each AngularJS module should create its own linking factory as shown below
```js
app.factory('$widgetsPodLink', function ($podLink) {
    return $podLink.register('widgets');
})
```

### Data
```js
$widgetsPodLink.data.set('header', 'Welcome to Widgets!');
$widgetsPodLink.data.get('widgets.header');
```
### Events
```js
// publish event
var message = 'Hello World!';
$widgetsPodLink.events.pub('MessageReceived', message);

// subscribe to event
$widgetsPodLink.subjects.sub('widgets.Navigation', function(message) {
    console.log(message);
});
```
### Subjects
```js
// create new subject
var initialValue = null;
var isGloballyVisible = true;
$widgetsPodLink.subjects.new('Navigation', initialValue, isGloballyVisible);

// publish next value
var navigationObject = { selectedLevel: 0 };
$widgetsPodLink.subjects.next('Navigation', navigationObject);

// subscribe to subject
$widgetsPodLink.subjects.sub('widgets.Navigation', function(navigationObject) {
    console.log(navigationObject);
});

```
### Shared UI-Router States
```js
var isSharedState = true;
$codeReviewPodLink.state.add('widgetSettings', { .. state definition .. }, isSharedState);
```
