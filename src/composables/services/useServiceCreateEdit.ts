import { Image } from 'src/interfaces/service';
import { useOptionsStore } from 'src/stores/options-store';
import { ref } from 'vue';
// import { useQuasar } from 'quasar';

export type ServiceFormData = {
  name: string;
  detail: {
    description: string;
    specifications: {
      df: string;
    };
  };
  price: number | null;
  images: Image[];
  tags: { id: string; name: string }[];
};

export type fileWithUrl = File & { url?: string };

export const useServiceCreateEdit = (props: ServiceFormData) => {
  // ----------- Stores -----------
  const optionsStore = useOptionsStore();

  // ----------- Refs -----------
  const formData = ref<ServiceFormData>({
    name: '',
    detail: {
      description: '',
      specifications: {
        df: '',
      },
    },
    price: null,
    images: [],
    tags: [],
  });

  const stepper = ref(null);
  // const dialog = defineModel({ default: false });
  // const $q = useQuasar();
  const nameRef = ref(null);
  const descriptionRef = ref(null);
  const priceRef = ref(null);
  const selectedServicesIDs = ref<string[]>([]);
  const slide = ref(1);
  const step = ref(1);
  const files = ref<fileWithUrl[]>([]);
  // . . . . . services admin . . . . .
  const internGenres = ref(
    optionsStore.genres.map((genre) => ({
      ...genre,
      selected: false,
    }))
  );

  // ----------- Functions -----------
  const setPropsToFormData = () => {
    formData.value.name = props.name;
    formData.value.detail.description = props.detail?.description;
    formData.value.price = props.price;

    const idsServices = props.tags?.map((tag) => tag.id);

    // genres
    const internGenresIds = internGenres.value.map((genre) => genre.id);
    const genresIds = idsServices?.filter((id) => internGenresIds.includes(id));

    // Services
    const servicesIds = idsServices?.filter(
      (id) => !internGenresIds.includes(id)
    );

    internGenres.value = internGenres.value.map((genre) => {
      return {
        ...genre,
        selected: genresIds?.includes(genre.id),
      };
    });

    selectedServicesIDs.value = servicesIds || [];

    files.value = props.images as unknown as fileWithUrl[];
  };

  if (props) {
    setPropsToFormData();
  }

  return {
    formData,
    stepper,
    // dialog,
    // $q,
    nameRef,
    descriptionRef,
    priceRef,
    selectedServicesIDs,
    slide,
    step,
    files,

    internGenres,
  };
};
