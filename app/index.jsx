import { configureStore, createSlice, nanoid } from "@reduxjs/toolkit";
import * as Device from "expo-device";
import { useMemo, useState } from "react";
import { FlatList, Platform, SafeAreaView, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Appbar, Avatar, Banner, Button, Card, MD3DarkTheme, MD3LightTheme, Provider as PaperProvider, Switch, Text, TextInput } from "react-native-paper";
import { Provider as ReduxProvider, useDispatch, useSelector } from "react-redux";

/********************
 * Redux State Management
 ********************/

// UI slice: theme + banners
const uiSlice = createSlice({
  name: "ui",
  initialState: { darkMode: false, showBanner: false, bannerMessage: "" },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
    },
    showBanner(state, action) {
      state.showBanner = true;
      state.bannerMessage = action.payload;
    },
    dismissBanner(state) {
      state.showBanner = false;
      state.bannerMessage = "";
    },
  },
});

// Todo slice to demonstrate lists and immutable updates
const todosSlice = createSlice({
  name: "todos",
  initialState: { items: [] },
  reducers: {
    addTodo: {
      reducer(state, action) {
        state.items.unshift(action.payload);
      },
      prepare(title) {
        const now = new Date();
        return { 
          payload: { 
            id: nanoid(), 
            title, 
            done: false, 
            createdAt: Date.now(),
            dateTime: now.toLocaleString()
          } 
        };
      },
    },
    toggleTodo(state, action) {
      const t = state.items.find((x) => x.id === action.payload);
      if (t) t.done = !t.done;
    },
    removeTodo(state, action) {
      state.items = state.items.filter((x) => x.id !== action.payload);
    },
    clearTodos(state) {
      state.items = state.items.filter(item => item.done);
    },
  },
});

const { toggleDarkMode, showBanner, dismissBanner } = uiSlice.actions;
const { addTodo, toggleTodo, removeTodo, clearTodos } = todosSlice.actions;

const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    todos: todosSlice.reducer,
  },
});

/********************
 * App Root
 ********************/

export default function App() {
  return (
    <ReduxProvider store={store}>
      <ThemedApp />
    </ReduxProvider>
  );
}

function ThemedApp() {
  const darkMode = useSelector((s) => s.ui.darkMode);
  const theme = useMemo(() => (darkMode ? MD3DarkTheme : MD3LightTheme), [darkMode]);
  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={{ flex: 1 }}>
        <AppScaffold />
      </SafeAreaView>
    </PaperProvider>
  );
}

/********************
 * User Interface Design
 ********************/

function AppScaffold() {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const showBanner = useSelector((s) => s.ui.showBanner);
  const bannerMessage = useSelector((s) => s.ui.bannerMessage);

  // Removed auto-dismiss effect to keep banner visible until user presses "Got it"
  // React.useEffect(() => {
  //   if (showBanner) {
  //     const timer = setTimeout(() => {
  //       dispatch(dismissBanner());
  //     }, 3000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [showBanner, dispatch]);

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <Appbar.Header>
        <Appbar.Content title="Expo + Redux Demo" subtitle={`Running on ${Device.osName ?? "Unknown OS"}`} />
        <DarkModeSwitch />
      </Appbar.Header>

      {showBanner && (
        <Banner
          visible
          style={styles.banner}
          actions={[
            {
              label: "Got it",
              onPress: () => dispatch(dismissBanner()),
              labelStyle: { color: "#fff" },
            },
          ]}
          icon={({ size }) => (
            <Avatar.Icon size={size} icon="information-outline" />
          )}
        >
          <Text style={{ color: "#fff" }}>{bannerMessage}</Text>
        </Banner>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={[isTablet && styles.contentTablet, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.column, isTablet && styles.columnTablet, { paddingRight: 8, marginBottom: 16 }]}>
          <TodosCard />
        </View>
        <View style={[styles.column, isTablet && styles.columnTablet, { paddingLeft: 8, marginTop: 16 }]}>
          <FinishedTasksCard />
        </View>
      </ScrollView>

      <Appbar style={styles.footer}>
        <Appbar.Action icon="github" accessibilityLabel="GitHub" onPress={() => {}} />
        <Appbar.Content title="Footer" subtitle={Platform.select({ ios: "iOS", android: "Android", default: "Web" })} />
      </Appbar>
    </View>
  );
}

function DarkModeSwitch() {
  const dispatch = useDispatch();
  const darkMode = useSelector((s) => s.ui.darkMode);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 12 }}>
      <Text accessibilityRole="header" style={{ marginRight: 8 }}>{darkMode ? "Dark" : "Light"}</Text>
      <Switch
        value={darkMode}
        onValueChange={() => dispatch(toggleDarkMode())}
        accessibilityLabel="Toggle dark mode"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
    </View>
  );
}

/********************
 * Reusable Components
 ********************/

function TodosCard() {
  const todos = useSelector((s) => s.todos.items);
  const dispatch = useDispatch();
  const [text, setText] = useState("");
  const activeTasks = todos.filter(item => !item.done);

  return (
    <Card style={{ marginBottom: 16 }}>
      <Card.Title title="Active Tasks" subtitle={`${activeTasks.length} items`} />
      <Card.Content>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <TextInput
            placeholder="Add new todo..."
            value={text}
            onChangeText={setText}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button 
            mode="contained"
            onPress={() => {
              if (text.trim()) {
                dispatch(addTodo(text.trim()));
                dispatch(showBanner("A new task has been added to the list"));
                setText("");
              }
            }}
          >
            Add
          </Button>
        </View>
        <FlatList
          data={activeTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ textDecorationLine: "none" }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 12, color: "gray" }}>
                  {item.dateTime}
                </Text>
              </View>
              <Button onPress={() => dispatch(toggleTodo(item.id))}>Done</Button>
            </View>
          )}
          scrollEnabled={false}
        />
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => dispatch(clearTodos())}>Clear All</Button>
      </Card.Actions>
    </Card>
  );
}

function FinishedTasksCard() {
  const todos = useSelector((s) => s.todos.items);
  const dispatch = useDispatch();
  const finishedTasks = todos.filter(item => item.done);

  return (
    <Card style={styles.finishedTasksCard}>
      <Card.Title title="Finished Tasks" subtitle={`${finishedTasks.length} items`} />
      <Card.Content>
        {finishedTasks.length === 0 ? (
          <Text>No finished tasks yet</Text>
        ) : (
          <FlatList
            data={finishedTasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 4, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ textDecorationLine: "line-through" }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "gray" }}>
                    {item.dateTime}
                  </Text>
                </View>
                <Button onPress={() => dispatch(toggleTodo(item.id))} compact>
                  Undo
                </Button>
                <Button onPress={() => dispatch(removeTodo(item.id))} compact>
                  Remove
                </Button>
              </View>
            )}
            scrollEnabled={false}
          />
        )}
      </Card.Content>
    </Card>
  );
}

/********************
 * Styles
 ********************/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  containerTablet: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
  contentTablet: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  column: {
    flex: 1,
    paddingHorizontal: 16,
  },
  columnTablet: {
    paddingHorizontal: 8,
  },
  finishedTasksCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderRadius: 8,
  },
  banner: {
    backgroundColor: "#6200ee",
    color: "#fff",
    // Adjust banner size for standard appearance
    textAlign: "center",
    paddingVertical: 4,
    minHeight: 40,
    justifyContent: "center",
  },
  footer: {
    backgroundColor: "#6200ee",
  },
});
