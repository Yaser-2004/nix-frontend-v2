import { TagIcon } from "@/assets/TagIcon";
import MoreMenu from "@/components/MoreMenu";
import { moreMenuOptionsGenerator } from "@/components/MoreMenu/generator";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import { Spinner } from "@/components/Spinner";
import Table from "@/components/Table";
import { YOUR_BLOGS_PER_PAGE as perPage } from "@/config";
import { ErrorContext } from "@/contexts/error";
import API from "@/services/API";
import { Blog } from "@/types/blog";
import BlogCategory from "@/types/blogCategory";
import BlogStatus from "@/types/blogStatus";
import { useContext, useEffect, useReducer } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

interface YourStoriesState {
  blogs: Blog[];
  searchTerm: string;
  statusFilters: BlogStatus[];
  loading: boolean;
  currentPage: number;
}

const initialState: YourStoriesState = {
  blogs: [],
  searchTerm: "",
  statusFilters: Object.keys(BlogStatus)
    .map((v) => Number(v))
    .filter((v) => !isNaN(v)),
  loading: true,
  currentPage: 1,
};

const myBlogsEndpoint = "/blog/my-blogs";

const enum ActionType {
  SetBlogs,
  SetSearchTerm,
  SetStatusFilers,
  SetLoading,
  SetCurrentPage,
}

const reducer = (
  state: YourStoriesState,
  action: { type: ActionType; payload },
) => {
  const updatedData = { ...state };
  const newStatusFilters = [...updatedData.statusFilters];
  switch (action.type) {
    case ActionType.SetBlogs:
      updatedData.blogs = action.payload;
      break;
    case ActionType.SetSearchTerm:
      updatedData.searchTerm = action.payload;
      updatedData.currentPage = 1;
      break;
    case ActionType.SetStatusFilers:
      //also spread operator creates only a shallow copy so mutable data structures like arrays still
      //refer to their originals. so we need to spread it out again
      //if present in filter, remove. Else, add
      if (newStatusFilters.includes(action.payload)) {
        console.debug(newStatusFilters, action.payload);
        newStatusFilters.splice(newStatusFilters.indexOf(action.payload), 1);
        console.debug(newStatusFilters);
      } else {
        newStatusFilters.push(action.payload);
      }
      updatedData.statusFilters = newStatusFilters;
      break;
    case ActionType.SetLoading:
      updatedData.loading = action.payload;
      break;
    default:
      return updatedData;
  }
  return updatedData;
};

const getFilteredBlogs = (
  blogs: Blog[],
  statusFilters: BlogStatus[],
  searchTerm: string,
) => {
  return blogs.filter(
    (blog) =>
      statusFilters.includes(blog.status) &&
      blog?.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );
};

const tableHeaders = ["Last Updated", "Title", "Category", "Status"];

export default function AllStory() {
  const navigate = useNavigate();
  const { setError } = useContext(ErrorContext);
  const [state, dispatch] = useReducer(reducer, initialState);

  const { blogs, searchTerm, statusFilters, loading } = state;

  const fetchBlogs = () => {
    API.get(myBlogsEndpoint, { data: { userOnly: true } })
      .then((blogResponse) => {
        dispatch({
          type: ActionType.SetBlogs,
          payload: blogResponse.data.data,
        });
        dispatch({ type: ActionType.SetLoading, payload: false });
      })
      .catch((error) => {
        setError(error);
        dispatch({ type: ActionType.SetLoading, payload: false });
      });
  };

  const more_menu_options = (blog: Blog) =>
    moreMenuOptionsGenerator({ blog, navigate, fetchBlogs, setError, toast });

  useEffect(() => {
    fetchBlogs();
  }, []);

  if (loading)
    return (
      <div className="flex flex-grow w-full h-screen justify-center items-center">
        <Spinner />
      </div>
    );

  const indexOfLastBlog = state.currentPage * perPage;
  const indexOfFirstBlog = indexOfLastBlog - perPage;

  const filteredBlogs = getFilteredBlogs(blogs, statusFilters, searchTerm);
  const paginatedBlogs = filteredBlogs.slice(indexOfFirstBlog, indexOfLastBlog);

  const handlePageChange = (newPage: number) => {
    dispatch({ type: ActionType.SetCurrentPage, payload: newPage });
  };

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1>Your Stories</h1>
      <div className="px-3 mt-4">
        <SearchBar
          searchTerm={searchTerm}
          onSearch={(value) =>
            dispatch({ type: ActionType.SetSearchTerm, payload: value })
          }
        />
        <div className="flex mt-4 space-x-8">
          {Object.keys(BlogStatus)
            .filter((v) => isNaN(Number(v)))
            .map((status) => {
              return { status, id: BlogStatus[status] };
            })
            .map(({ status, id }) => (
              <label key={id} className="ms-2  text-md text-gray-900">
                <input
                  className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                  type="checkbox"
                  checked={statusFilters.includes(id)}
                  onChange={() =>
                    dispatch({ type: ActionType.SetStatusFilers, payload: id })
                  }
                />
                {status}
              </label>
            ))}
        </div>
      </div>
      <main className="flex-grow p-6">
        <Table
          headers={tableHeaders}
          content={paginatedBlogs.map((blog) => [
            <div key={blog._id} className="max-w-24">
              {new Date(blog.updatedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>,
            <Link
              key={`read-${blog._id}`}
              to={`/story/${blog._id}`}
              state={{ blog: blog }}
            >
              {blog.title}
            </Link>,

            BlogCategory[blog.category_id],
            <span
              // tailwind is compiled to real css, so we can't use dynamic tailwind wale class names
              // alternative fix is to re-export these class names in index.css
              // i'm lazy, so i just did this impl instead
              className={`px-2 py-1 inline-block rounded-md ${
                BlogStatus[blog.status]
              }`}
              key={blog.category_id}
            >
              <TagIcon className="w-4 h-4 inline max-lg:hidden mr-1 size-min" />
              {BlogStatus[blog.status]}
            </span>,
            <MoreMenu
              options={more_menu_options(blog)}
              blogId={blog._id}
              key={blog._id}
            />,
          ])}
        />
      </main>
      <Pagination
        filtered_content={filteredBlogs}
        current_page={state.currentPage}
        per_page={perPage}
        handlePageChange={handlePageChange}
      />
    </div>
  );
}
