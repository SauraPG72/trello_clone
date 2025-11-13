// import { createClient } from "./supabase/client"
import { Board, Column, Task } from "./supabase/models";
import {SupabaseClient} from "@supabase/supabase-js"

// const supabase = createClient();

export const boardService = {

    async getBoard(supabase: SupabaseClient, boardId: string): Promise<Board> {
        const {data, error} = await supabase
            .from("boards")
            .select("*")
            .eq("id", boardId)
            .single();

        if (error) throw error ;

        return data;
    },

    async getBoards(supabase: SupabaseClient, userId: string): Promise<Board[]> {
        const {data, error} = await supabase
            .from("boards")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", {ascending: false});

        if (error) throw error ;

        return data || [];
    },

    async createBoard(supabase: SupabaseClient, board: Omit<Board, "id" | "created_at" | "updated_at">): Promise<Board> {

        const {data, error} = await supabase
        .from("boards")
        .insert(board)
        .select()
        .single()

        if (error) throw error ;

        return data;

    },

    async updateBoard(supabase: SupabaseClient, boardId: string, updates: Partial<Board>): Promise<Board> {
        const {data, error} = await supabase
            .from("boards")
            .update({...updates, updated_at: new Date().toISOString()})
            .eq("id", boardId)
            .select()
            .single()
        
        if (error) throw error;
        return data;
    }
};

export const columnService = {

    async getColumns(supabase: SupabaseClient, boardId: string): Promise<Column[]> {
        const {data, error} = await supabase
            .from("columns")
            .select("*")
            .eq("board_id", boardId)
            .order("sort_order", {ascending: true});

        if (error) throw error ;

        return data || [];
    },


    async createColumn(supabase: SupabaseClient, column: Omit<Column, "id" | "created_at">): Promise<Column> {
        const {data, error} = await supabase 
            .from("columns")
            .insert(column)
            .select()
            .single();
        
        if (error) throw error;

        return data;
    },

    async updateColumnTitle(
        supabase: SupabaseClient,
        columnId: string,
        title: string
    ): Promise<Column> {
        const { data, error } = await supabase
        .from("columns")
        .update({ title })
        .eq("id", columnId)
        .select()
        .single();

        if (error) throw error;
        return data;
    },
}

export const taskService = {
      async getTasksByBoard(
      supabase: SupabaseClient,
      boardId: string
    ): Promise<Task[]> {
      console.log("getTasksByBoard called with boardId:", boardId);
      console.log("boardId type:", typeof boardId);

      // First get all column IDs for this board
      const { data: columns, error: columnsError } = await supabase
          .from("columns")
          .select("id")
          .eq("board_id", boardId);

      console.log("Columns query result:", columns);
      console.log("Columns query error:", columnsError);

      if (columnsError) {
          console.error("Error fetching columns:", columnsError);
          throw columnsError;
      }

      if (!columns || columns.length === 0) {
          console.log("No columns found for board:", boardId);
          return [];
      }

      const columnIds = columns.map(col => col.id);
      console.log("Column IDs found:", columnIds);

      // Then get all tasks for those columns
      const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .in("column_id", columnIds)  // This should work with the array
          .order("sort_order", { ascending: true });

      if (error) {
          console.error("Error fetching tasks:", error);
          throw error;
      }

      console.log("Tasks found:", data);
      return data || [];
    },

    async createTask(supabase: SupabaseClient, task: Omit<Task, "id" | "created_at" | "updated_at">): Promise<Task> {
        const {data, error} = await supabase 
            .from("tasks")
            .insert(task)
            .select()
            .single();
        
        if (error) throw error;

        return data;
    },

    async moveTask(supabase: SupabaseClient, taskId: string, newColumnId: string, newOrder: number) {
        const {data, error} = await supabase
            .from("tasks")
            .update({column_id: newColumnId, sort_order: newOrder})
            .eq("id", taskId)
        if (error) throw error;
        return data;
    }


}

export const boardDataService = { 

    async getBoardWithColumns(supabase: SupabaseClient, boardId: string) {
        console.log("getBoardWithColumns called with boardId:", boardId);
        console.log("boardId type:", typeof boardId);

        const [board, columns] = await Promise.all([
            boardService.getBoard(supabase, boardId),
            columnService.getColumns(supabase, boardId)

        ]);

        console.log("Board fetched:", board);
        console.log("Columns fetched:", columns);

        if (!board) throw new Error("Board not found");

        console.log("About to call getTasksByBoard with boardId:", boardId);
        const tasks = await taskService.getTasksByBoard(supabase, boardId)

        const columnsWithTasks = columns.map((column) => ({
            ...column, 
            tasks: tasks.filter((task) => task.column_id === column.id),
        }))

        return {
            board, 
            columnsWithTasks
        }
    },
    
    async createBoardWithDefaultColumns(supabase: SupabaseClient, boardData: {
        title: string, 
        description?: string, 
        color?: string, 
        userId: string
    }
    ) {
        const board = await boardService.createBoard(supabase, {
            title: boardData.title, 
            description: boardData.description || null,
            color: boardData.color || "bg-blue-500",
            user_id: boardData.userId
        });

        const defaultColumns = [
            {title: "To Do", sort_order: 0},
            {title: "In Progress", sort_order: 1},
            {title: "Review", sort_order: 2},
            {title: "Done", sort_order: 3},
        ];

        await Promise.all(
            defaultColumns.map((column) => 
                columnService.createColumn(supabase, {
                    ...column, 
                    board_id: board.id, 
                    user_id: boardData.userId
                })
            )
        );

        return board;
    },
};


